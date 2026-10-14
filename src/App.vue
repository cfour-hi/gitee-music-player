<template>
  <header>
    <PlayerToolbar
      v-show="!searching"
      :song-loading="songLoading"
      :has-songs="displayedSongs.length > 0"
      :moods="moods"
      :mood="mood"
      :play-mode="playMode"
      @refresh="clickRefresh"
      @play-by-order="clickPlayByOrder"
      @play-by-random="clickPlayByRandom"
      @set-mood="setMood"
      @search="clickSearch"
      @open-discover="discoverOpen = true"
    />

    <SearchBar
      v-show="searching"
      ref="searchBarRef"
      v-model="searchContent"
      :result-count="searchContent ? displayedSongs.length : 0"
      @blur="blurSearchInput"
      @esc="closeSearch"
      @clear="clearSearch"
    />
  </header>

  <SongList
    :songs="displayedSongs"
    :active-song-sha="activeSongSha"
    :get-song-state="getSongState"
    :hl="hl"
    :searching="searching"
    :search-content="searchContent"
    @click-song="clickSongBySha"
    @item-touch-start="onItemTouchStart"
    @item-touch-end="onItemTouchEnd"
    @item-touch-move="onItemTouchEnd"
    @item-context-menu="openAction"
  />

  <PlayerBar
    ref="playerBarRef"
    :song="activeSong"
    :playing="audioPlaying"
    :progress="audioProgress"
    @click="clickFooter"
    @resume="clickResume"
    @pause="clickPause"
    @prev="clickPrev"
    @next="clickNext"
  />

  <div v-if="displayedSongs.length > 0" class="to-top" @click="clickToTop">
    <ToTopOutlined />
  </div>

  <SongActionSheet
    :song="actionSong"
    :editing="editingMeta"
    :state="actionSong ? getSongState(actionSong) : {}"
    :form="editForm"
    @close="closeAction"
    @manual-cool="clickManualCool"
    @unfreeze="clickUnfreeze"
    @edit="openEditMeta"
    @save="saveEditMeta"
    @cancel="cancelEditMeta"
    @reset="resetEditMeta"
    @update:form="editForm = $event"
  />

  <DiscoverPanel
    v-if="discoverOpen"
    :local-songs="songList"
    @close="discoverOpen = false"
    @play-local="playFromDiscover"
  />

  <ToastContainer />
</template>

<script setup>
import { nextTick, onMounted, ref, computed } from 'vue';
import { ToTopOutlined } from '@ant-design/icons-vue';
import useSong from './hooks/use-song';
import useMusicDB from './hooks/use-music-db';
import useSongParse from './hooks/use-song-parse';
import useMusicSearch, { highlightText } from './hooks/use-music-search';
import useSongState from './hooks/use-song-state';
import useMood from './hooks/use-mood';
import useMediaSession from './hooks/use-media-session';
import { useToast } from './hooks/use-toast';
import { isAudio } from './helper';

import PlayerToolbar from './components/PlayerToolbar.vue';
import SearchBar from './components/SearchBar.vue';
import SongList from './components/SongList.vue';
import PlayerBar from './components/PlayerBar.vue';
import SongActionSheet from './components/SongActionSheet.vue';
import DiscoverPanel from './components/DiscoverPanel.vue';
import ToastContainer from './components/ToastContainer.vue';

const OWNER = import.meta.env.VITE_OWNER;
const REPOS = import.meta.env.VITE_REPOS.split(',');
const BRANCH = import.meta.env.VITE_BRANCH;
const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

const { toast } = useToast();

// ---- 歌曲数据 ----
const { songLoading, songList, songListSorted } = useSong();

// ---- 播放状态 ----
const playerBarRef = ref(null);
const audioPlaying = ref(false);
const audioProgress = ref(0);

// 随机模式"上一首/下一首"用的播放历史栈（存 sha，栈顶为最近）
// back 栈：正常前进时压入当前歌；forward 栈：回退时压入当前歌，供"下一首"恢复
const playHistory = ref([]);
const PLAY_HISTORY_LIMIT = 100;
const forwardStack = ref([]);
const FORWARD_HISTORY_LIMIT = 100;

function pushPlayHistory(sha) {
  const h = playHistory.value;
  if (h[h.length - 1] !== sha) {
    h.push(sha);
    if (h.length > PLAY_HISTORY_LIMIT) h.shift();
  }
}

function pushForward(sha) {
  const f = forwardStack.value;
  if (f[f.length - 1] !== sha) {
    f.push(sha);
    if (f.length > FORWARD_HISTORY_LIMIT) f.shift();
  }
}

// ---- 搜索 ----
const musicDB = useMusicDB();
const { searching, searchContent, filteredSongs, keywords, clickSearch: openSearch, closeSearch, clearSearch, blurSearchInput } =
  useMusicSearch(songListSorted);

const searchBarRef = ref(null);

// 包装搜索：打开搜索并自动聚焦输入框
async function clickSearch() {
  openSearch();
  await nextTick();
  searchBarRef.value?.focus();
}

// ---- 解析 ----
const { resolveSongData, resolveSongTag, toSongCover, finalizeSongMeta } = useSongParse();

// ---- 冷却 + 情绪 ----
const songState = useSongState(musicDB, songList);
const { moods, mood, setMood, targetHour } = useMood();

// ---- 当前激活歌曲 ----
const activeSongSha = ref(null);
const playMode = ref('order');
const activeSong = computed(() =>
  songList.value.find((s) => s.sha === activeSongSha.value) || null
);

// ---- 长按菜单 ----
const actionSong = ref(null);
let longPressTimer = null;

// ---- 发现面板 ----
const discoverOpen = ref(false);

// 从发现面板点已入库的歌：关闭面板并播放本地 blob
async function playFromDiscover(song) {
  discoverOpen.value = false;
  await playSong(song);
}

// ---- 编辑歌曲信息 ----
const editingMeta = ref(false);
const editForm = ref({ title: '', artist: '', album: '' });

// ---- 列表 = 搜索过滤结果 ----
const displayedSongs = computed(() => filteredSongs.value);

// 搜索命中高亮
function hl(text) {
  return highlightText(text, keywords.value);
}

// 暴露给模板的 getState 包装
function getSongState(song) {
  return songState.getState(song);
}

// 获取 audio 元素（从 PlayerBar 组件内部）
function getAudioEl() {
  // 子组件 defineExpose 暴露的 ref 在父组件访问时已自动解包
  return playerBarRef.value?.audioRef;
}

// 检测蜂窝网络
function isMeteredConnection() {
  const conn = navigator.connection;
  if (!conn) return false;
  if (conn.type === 'cellular') return true;
  if (['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return true;
  return false;
}

onMounted(async () => {
  songLoading.value = true;
  await musicDB.connect();
  await songState.init();
  await resolveSongsFromLocal();
  songLoading.value = false;
});

async function resolveSongsFromLocal() {
  const songs = await musicDB.get();
  const resolvedSongs = [];
  for (const song of songs) {
    try {
      song._tag = await resolveSongTag(song.blob);
      song._cover = toSongCover(song._tag);
      song._src = URL.createObjectURL(song.blob);
    } catch (err) {
      console.error('本地歌曲解析失败（已跳过）:', song.path, err?.message || err);
      continue;
    }
    if (!Array.isArray(song.tags)) song.tags = [];
    if (song.manualCooledUntil === undefined) song.manualCooledUntil = null;
    if (!song.addedAt) song.addedAt = 0;
    if (song.manualMeta === undefined) song.manualMeta = null;

    finalizeSongMeta(song);
    resolvedSongs.push(song);
  }
  songList.value = resolvedSongs;
}

// ---- 媒体会话（车机 / 蓝牙 / 方向盘按键适配）----
// 物理键 → 系统媒体服务 → navigator.mediaSession action 回调，不经 DOM keydown。
// 详情见 use-media-session.js。
const mediaSession = useMediaSession({
  getAudioEl,
  onPlay: handleMediaPlay,
  onPause: clickPause,
  onPrev: clickPrev,
  onNext: clickNext,
  // 真实播放状态跟随：来电 / 蓝牙断连等系统级暂停也会更新 UI 与进度循环
  onPlayStateChange(playing) {
    audioPlaying.value = playing;
    updateDocumentTitle();
    if (playing) window.requestAnimationFrame(toAudioProgrssFrame);
  },
});

async function handleMediaPlay() {
  if (activeSongSha.value) {
    await clickResume();
  } else {
    await clickPlayByRandom();
  }
  mediaSession.updateMetadata(activeSong.value);
}

function updateDocumentTitle() {
  if (!activeSong.value || !activeSong.value._tag) {
    document.title = 'Music';
    return;
  }
  const title = activeSong.value._tag.tags.title;
  const artist = activeSong.value._tag.tags.artist;
  const playingIcon = audioPlaying.value ? '🎵' : '⏸️';
  document.title = `${playingIcon} ${title} - ${artist}`;
}

// ---- 刷新歌曲列表 ----
async function clickRefresh() {
  if (songLoading.value) return;
  songLoading.value = true;
  try {
    let fetchFailed = false;
    const allRemoteSongs = (await Promise.all(REPOS.map(async repo => {
      try {
        const res = await fetch(`https://gitee.com/api/v5/repos/${OWNER}/${repo}/git/trees/${BRANCH}?access_token=${ACCESS_TOKEN}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.tree.filter(isAudio).map(item => ({ ...item, repo }));
      } catch(err) {
        fetchFailed = true;
        console.log(`从仓库"${repo}"获取歌曲列表失败`, err);
      }
      return [];
    }))).flat();

    if (!fetchFailed) {
      for (let i = songList.value.length - 1; i >= 0; i -= 1) {
        const song = songList.value[i];
        if (!allRemoteSongs.find((o) => o.sha === song.sha)) {
          await musicDB.delete(song.sha);
          songList.value.splice(i, 1);
        }
      }
    }

    const localSongs = await musicDB.get();
    const localShaSet = new Set([
      ...songList.value.map((s) => s.sha),
      ...localSongs.map((s) => s.sha),
    ]);
    const newSongs = allRemoteSongs.filter((o) => !localShaSet.has(o.sha));

    if (newSongs.length > 0) {
      if (isMeteredConnection()) {
        const ok = window.confirm(
          `当前检测到可能是蜂窝网络，即将下载 ${newSongs.length} 首新歌（约几十 MB），可能消耗移动流量。\n\n点击"确定"继续下载，点击"取消"仅更新列表不下载歌曲。`,
        );
        if (!ok) return;
      }
      toast.info(`正在下载 ${newSongs.length} 首新歌...`);

      for (let i = 0; i < newSongs.length / 5; i += 1) {
        const start = i * 5;
        const sliceSongs = newSongs.slice(start, start + 5);
        const results = await Promise.allSettled(
          sliceSongs.map(async (song) => {
            const blob = await resolveSongData(song);
            await musicDB.add({
              blob,
              path: song.path,
              sha: song.sha,
              repo: song.repo,
              addedAt: Date.now(),
              tags: [],
              manualCooledUntil: null,
            });
            return song;
          }),
        );
        const resolvedSongs = [];
        for (const r of results) {
          if (r.status === 'fulfilled') {
            resolvedSongs.push(r.value);
          } else {
            console.error('歌曲下载失败（已跳过）:', r.reason?.message || r.reason);
          }
        }
        songList.value.push(...resolvedSongs);
      }
      toast.success(`下载完成，共更新 ${newSongs.length} 首歌曲`);
    } else {
      toast.info('歌曲列表已是最新');
    }
  } finally {
    songLoading.value = false;
  }
}

// ---- 播放控制 ----
async function clickPlayByOrder(evt) {
  playMode.value = 'order';
  const list = displayedSongs.value;
  if (!list.length) return;

  let idx = 0;
  if (activeSongSha.value) {
    const currentIdx = list.findIndex((s) => s.sha === activeSongSha.value);
    if (currentIdx >= 0 && (!evt || evt.type === 'ended') && currentIdx < list.length - 1) {
      idx = currentIdx + 1;
    } else if (currentIdx >= 0) {
      idx = currentIdx;
    }
  }
  await playSong(list[idx]);
}

async function clickPlayByRandom() {
  playMode.value = 'random';
  const candidates = displayedSongs.value.filter((s) => !getSongState(s).isCooled);
  if (!candidates.length) return;

  const picked = songState.weightedPick(candidates, targetHour());
  if (!picked) return;

  await playSong(picked);
}

async function playSong(song, kind = 'next', recordHistory = true) {
  const audioEl = getAudioEl();
  if (activeSongSha.value && audioEl && audioEl.duration > 0) {
    const prev = songList.value.find((s) => s.sha === activeSongSha.value);
    if (prev && isFinite(audioEl.duration)) {
      const ratio = audioEl.currentTime / audioEl.duration;
      await songState.recordPlay(prev.sha, ratio, kind);
    }
  }

  // 正常切歌时把当前歌压入历史栈；"上一首"回退播放不重新入栈，避免来回抖动
  // 同时清空前进栈：点歌 / 随机 / 顺序都是新的前进路径，旧的"下一首恢复"不再有效
  if (recordHistory && activeSongSha.value) {
    pushPlayHistory(activeSongSha.value);
    forwardStack.value.length = 0;
  }

  if (audioPlaying.value) {
    clickPause();
  }

  activeSongSha.value = song.sha;
  await nextTick();
  await clickResume();

  const audioEl2 = getAudioEl();
  if (audioEl2) {
    audioEl2.onended = () => {
      if (playMode.value === 'random') {
        clickPlayByRandom();
      } else {
        clickPlayByOrder({ type: 'ended' });
      }
    };
  }
}

async function clickSongBySha(sha) {
  const song = songList.value.find((s) => s.sha === sha);
  if (!song) return;

  const st = getSongState(song);
  if (st.isCooled && activeSongSha.value !== sha) {
    await songState.unfreeze(sha);
    toast.success(`已解冻「${song._tag?.tags.title || song.path}」`);
    return;
  }

  await playSong(song);
}

async function clickResume() {
  const audioEl = getAudioEl();
  if (!audioEl) return;
  // 页面无用户手势时（如刚打开就用车机按键播放），play() 会被浏览器拒绝
  try {
    await audioEl.play();
  } catch (err) {
    // AbortError：play() 被后续操作中断（切歌/快速连按），非失败，忽略
    if (err?.name === 'AbortError') return;
    if (err?.name === 'NotAllowedError') {
      toast.warning('需要先在屏幕上点一下播放，之后才能用车机/方向盘按键');
    } else {
      toast.error('播放失败');
    }
    return;
  }
  audioPlaying.value = true;
  mediaSession.updateMetadata(activeSong.value);
  updateDocumentTitle();
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function toAudioProgrssFrame() {
  const audioEl = getAudioEl();
  if (!activeSongSha.value || !audioPlaying.value || !audioEl) return;
  audioProgress.value = audioEl.currentTime / audioEl.duration;
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function clickFooter() {
  const activeItem = document.querySelector('.song-item.active');
  if (activeItem) {
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clickPause() {
  const audioEl = getAudioEl();
  if (!audioEl) return;
  audioEl.pause();
  audioPlaying.value = false;
  updateDocumentTitle();
}

function clickPrev() {
  if (playMode.value === 'random') {
    playPrevFromHistory();
    return;
  }

  // 顺序模式：回退到列表中当前曲目的前一首
  const list = displayedSongs.value;
  const currentIdx = activeSongSha.value
    ? list.findIndex((s) => s.sha === activeSongSha.value)
    : -1;
  if (currentIdx > 0) {
    playSong(list[currentIdx - 1], 'prev');
  } else {
    // 已在列表第一首（或当前歌不在当前列表中），回退到历史栈
    playPrevFromHistory();
  }
}

// 随机模式"上一首"：从历史栈弹出最近播放过的一首
async function playPrevFromHistory() {
  while (playHistory.value.length) {
    const sha = playHistory.value.pop();
    const song = songList.value.find((s) => s.sha === sha);
    if (!song) continue; // 该歌已被刷新移除，继续往前找
    // 把当前歌压入前进栈，使"上一首后再下一首"能回到刚才那首
    if (activeSongSha.value) pushForward(activeSongSha.value);
    await playSong(song, 'prev', false);
    return;
  }
}

// 随机模式"下一首"：若刚从"上一首"回来，优先沿前进栈恢复，否则重新随机
async function playNextFromForward() {
  while (forwardStack.value.length) {
    const sha = forwardStack.value.pop();
    const song = songList.value.find((s) => s.sha === sha);
    if (!song) continue; // 该歌已被刷新移除，继续往前找
    // 把当前歌压回历史栈，使"下一首后再上一首"仍能回到刚才那首
    if (activeSongSha.value) pushPlayHistory(activeSongSha.value);
    await playSong(song, 'next', false);
    return;
  }
  clickPlayByRandom(); // 前进栈为空（如刚随机过），退回正常随机
}

function clickNext() {
  if (playMode.value === 'random') {
    // 刚从"上一首"回来时，前进栈里还有刚才那首歌，优先恢复而非重新随机
    if (forwardStack.value.length) {
      playNextFromForward();
      return;
    }
    clickPlayByRandom();
  } else {
    clickPlayByOrder();
  }
}

function clickToTop() {
  document.querySelector('.song-list').scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- 长按菜单 ----
function onItemTouchStart(song) {
  longPressTimer = setTimeout(() => {
    openAction(song);
  }, 500);
}

function onItemTouchEnd() {
  clearTimeout(longPressTimer);
}

function openAction(song) {
  actionSong.value = song;
}

function closeAction() {
  actionSong.value = null;
  editingMeta.value = false;
}

async function clickManualCool() {
  if (!actionSong.value) return;
  await songState.manualCool(actionSong.value.sha, 28);
  toast.warning('已暂别 4 周');
  closeAction();
}

async function clickUnfreeze() {
  if (!actionSong.value) return;
  await songState.unfreeze(actionSong.value.sha);
  toast.success('已解冻');
  closeAction();
}

// ---- 编辑歌曲信息 ----
function openEditMeta() {
  if (!actionSong.value) return;
  editForm.value = {
    title: actionSong.value._tag?.tags.title || '',
    artist: actionSong.value._tag?.tags.artist || '',
    album: actionSong.value._tag?.tags.album || '',
  };
  editingMeta.value = true;
}

function cancelEditMeta() {
  editingMeta.value = false;
}

async function saveEditMeta() {
  if (!actionSong.value) return;
  const sha = actionSong.value.sha;
  const manualMeta = {
    title: editForm.value.title.trim(),
    artist: editForm.value.artist.trim(),
    album: editForm.value.album.trim(),
  };
  try {
    await musicDB.update(sha, { manualMeta });
  } catch (err) {
    console.error('保存手动修正失败:', err);
    toast.error('保存失败');
    return;
  }
  const song = songList.value.find((s) => s.sha === sha);
  if (song) {
    song.manualMeta = manualMeta;
    finalizeSongMeta(song);
    actionSong.value = song;
  }
  editingMeta.value = false;
  toast.success('已保存修改');
}

async function resetEditMeta() {
  if (!actionSong.value) return;
  const sha = actionSong.value.sha;
  try {
    await musicDB.update(sha, { manualMeta: null });
  } catch (err) {
    console.error('清除手动修正失败:', err);
    toast.error('清除失败');
    return;
  }
  const song = songList.value.find((s) => s.sha === sha);
  if (song) {
    song.manualMeta = null;
    finalizeSongMeta(song);
    actionSong.value = song;
  }
  editingMeta.value = false;
  toast.info('已清除手动修正');
}
</script>

<style scoped>
header {
  flex: 0 0 1.2rem;
  display: flex;
  align-items: center;
  background: var(--color-bg-base);
  overflow: hidden;
  position: relative;
}

.to-top {
  position: fixed;
  bottom: 1.8rem;
  right: var(--spacing-lg);
  width: 0.7rem;
  height: 0.7rem;
  border-radius: var(--radius-round);
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text);
  cursor: pointer;
  z-index: var(--z-index-backtop);
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:active {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }
}

.svg-icon__to-top {
  font-size: 1.5em;
}
</style>
