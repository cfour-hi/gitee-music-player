<template>
  <header>
    <div v-show="!searching" class="toolbar">
      <svg-icon
        name="loading"
        :class="{ loading: songLoading }"
        @click="clickRefresh"
      ></svg-icon>
      <div v-if="displayedSongs.length > 0" class="play-btns">
        <button @click="clickPlayByOrder">
          <svg-icon name="play"></svg-icon>
          顺序
        </button>
        <button @click="clickPlayByRandom">
          <svg-icon name="play-random"></svg-icon>
          随机
        </button>
      </div>
      <div v-if="displayedSongs.length > 0" class="mood-bar">
        <button
          v-for="m in moods"
          :key="m.key"
          class="mood-btn"
          :class="{ active: mood === m.key }"
          @click="setMood(m.key)"
        >{{ m.label }}</button>
      </div>
      <svg-icon name="search" @click="clickSearch"></svg-icon>
    </div>
    <input
      v-show="searching"
      v-model="searchContent"
      ref="searchRef"
      type="text"
      class="input-search"
      placeholder="支持拼音、首字母、繁体，空格分隔多个关键词"
      @blur="blurSearchInput"
      @keydown.esc="closeSearch"
    />
    <svg-icon v-show="searching" name="close" class="search-close" @click="clearSearch"></svg-icon>
  </header>

  <div v-if="searching && searchContent && displayedSongs.length > 0" class="search-summary">
    共 {{ displayedSongs.length }} 首
  </div>

  <main class="song-list">
    <div
      v-for="song in displayedSongs"
      :key="song.sha"
      class="song-item"
      :class="{
        active: activeSongSha === song.sha,
        cooled: getSongState(song).isCooled,
      }"
      @click="clickSongBySha(song.sha)"
      @touchstart="onItemTouchStart(song)"
      @touchend="onItemTouchEnd"
      @touchmove="onItemTouchEnd"
      @contextmenu.prevent="openAction(song)"
    >
      <img :src="song._cover || ''" class="song-cover" />
      <div class="song-info">
        <div class="song-name ellipsis">
          <span v-html="hl(song._tag && song._tag.tags.title)"></span>
          <span v-if="getSongState(song).isCooled" class="cool-badge">
            冷却中 · {{ getSongState(song).coolDownDays }} 天
          </span>
        </div>
        <div class="song-author ellipsis" v-html="hl(song._tag && song._tag.tags.artist)"></div>
      </div>
    </div>
    <div v-if="searching && searchContent && displayedSongs.length === 0" class="search-empty">
      <div class="search-empty-title">没有找到「{{ searchContent }}」相关的歌曲</div>
      <div class="search-empty-hint">试试：少输几个字 / 用歌手名或专辑名 / 检查错别字；支持拼音、首字母和繁体搜索</div>
    </div>
  </main>

  <footer v-if="activeSong" @click="clickFooter">
    <div
      class="audio-progress"
      :style="{ transform: `scaleX(${audioProgress})` }"
    >
      <audio ref="audioRef" :src="activeSong._src"></audio>
    </div>
    <img :src="activeSong._cover || ''" class="song-cover" />
    <div class="song-info">
      <div class="song-name ellipsis">
        {{ activeSong._tag.tags.title }}
      </div>
      <div class="song-author ellipsis">
        {{ activeSong._tag.tags.artist }}
      </div>
    </div>
    <div class="song-operate">
      <svg-icon
        v-show="!audioPlaying"
        name="play"
        @click.stop="clickResume"
      ></svg-icon>
      <svg-icon
        v-show="audioPlaying"
        name="pause"
        @click.stop="clickPause"
      ></svg-icon>
      <svg-icon name="next" @click.stop="clickNext"></svg-icon>
    </div>
  </footer>
  <div class="to-top" @click="clickToTop">
    <svg-icon name="to-top"></svg-icon>
  </div>

  <!-- 长按操作菜单 -->
  <div v-if="actionSong" class="action-overlay" @click="closeAction">
    <div class="action-sheet" @click.stop>
      <template v-if="!editingMeta">
        <div class="action-title ellipsis">
          {{ actionSong._tag?.tags.title }}
        </div>
        <div class="action-sub ellipsis">
          {{ actionSong._tag?.tags.artist }}
        </div>
        <div class="action-buttons">
          <button v-if="getSongState(actionSong).isCooled" class="action-btn unfreeze" @click="clickUnfreeze">
            立即解冻
          </button>
          <button v-else class="action-btn cool" @click="clickManualCool">
            暂别 4 周
          </button>
          <button class="action-btn edit" @click="openEditMeta">
            编辑信息
          </button>
          <button class="action-btn close" @click="closeAction">关闭</button>
        </div>
      </template>
      <template v-else>
        <div class="action-title">编辑歌曲信息</div>
        <div class="edit-form">
          <label>
            <span>歌名</span>
            <input v-model="editForm.title" type="text" placeholder="歌名" />
          </label>
          <label>
            <span>歌手</span>
            <input v-model="editForm.artist" type="text" placeholder="歌手" />
          </label>
          <label>
            <span>专辑</span>
            <input v-model="editForm.album" type="text" placeholder="专辑" />
          </label>
        </div>
        <div class="action-buttons">
          <button class="action-btn reset" @click="resetEditMeta">
            清除修正
          </button>
          <button class="action-btn save" @click="saveEditMeta">
            保存
          </button>
          <button class="action-btn close" @click="cancelEditMeta">取消</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import useSong from './hooks/use-song';
import useMusicDB from './hooks/use-music-db';
import useSongParse from './hooks/use-song-parse';
import useMusicSearch, { highlightText } from './hooks/use-music-search';
import useSongState from './hooks/use-song-state';
import useMood from './hooks/use-mood';
import { nextTick, onMounted, ref, computed } from 'vue';
import { isAudio } from './helper'

const OWNER = import.meta.env.VITE_OWNER;
const REPOS = import.meta.env.VITE_REPOS.split(',');
const BRANCH = import.meta.env.VITE_BRANCH;
const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

const { songLoading, songList, songListSorted } = useSong();

const audioRef = ref(null);
const audioPlaying = ref(false);
const audioProgress = ref(0);

const musicDB = useMusicDB();
const { searchRef, searching, searchContent, filteredSongs, keywords, clickSearch, closeSearch, clearSearch, blurSearchInput } =
  useMusicSearch(songListSorted);
const { resolveSongData, resolveSongTag, toSongCover, finalizeSongMeta } = useSongParse();

// 冷却状态 + 情绪开关
const songState = useSongState(musicDB, songList);
const { moods, mood, setMood, targetHour } = useMood();

// 当前激活歌曲 sha（替代 index 作为高亮依据）
const activeSongSha = ref(null);
// 当前播放模式：'order' 顺序播放 / 'random' 智能随机（默认顺序，兼容直接点歌后的自然播放）
const playMode = ref('order');
const activeSong = computed(() =>
  songList.value.find((s) => s.sha === activeSongSha.value) || null
);

// 长按菜单
const actionSong = ref(null);
let longPressTimer = null;

// 编辑歌曲信息（手动修正 title/artist/album）
const editingMeta = ref(false);
const editForm = ref({ title: '', artist: '', album: '' });

// 列表 = 搜索过滤结果（不再按场景标签过滤）
const displayedSongs = computed(() => filteredSongs.value);

// 搜索命中高亮（仅原文子串命中，拼音命中不高亮；内部已做 HTML 转义）
function hl(text) {
  return highlightText(text, keywords.value);
}

// 暴露给模板的 getState 包装
function getSongState(song) {
  return songState.getState(song);
}

// 检测当前是否为按流量计费的网络（蜂窝网络）
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

  registerMediaEvents();
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
      // 坏歌容错：单首解析失败只跳过，不阻塞整个歌曲列表加载
      console.error('本地歌曲解析失败（已跳过）:', song.path, err?.message || err);
      continue;
    }
    // 兼容旧数据：默认 tags 为空数组、manualCooledUntil 为 null
    if (!Array.isArray(song.tags)) song.tags = [];
    if (song.manualCooledUntil === undefined) song.manualCooledUntil = null;
    // 旧数据没有 addedAt，设为 0（很久以前），不触发新歌蜜月期
    if (!song.addedAt) song.addedAt = 0;
    // 兼容旧数据：manualMeta 字段
    if (song.manualMeta === undefined) song.manualMeta = null;

    // 统一走"手动修正 > ID3 tag > 文件名"的优先级合并
    finalizeSongMeta(song);
    resolvedSongs.push(song);
  }
  songList.value = resolvedSongs;
}

// 更新媒体会话元数据
function updateMediaSessionMetadata() {
  if (!navigator.mediaSession) return;
  if (!activeSong.value || !activeSong.value._tag) return;

  const metadata = new MediaMetadata({
    title: activeSong.value._tag.tags.title,
    artist: activeSong.value._tag.tags.artist,
    album: activeSong.value._tag.tags.album || '未知专辑',
    artwork: activeSong.value._cover ? [
      {
        src: activeSong.value._cover,
        sizes: '512x512',
        type: activeSong.value._tag.tags.picture?.format || 'image/jpeg',
      },
    ] : [],
  });
  navigator.mediaSession.metadata = metadata;
}

// 更新浏览器标签页标题
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

// 注册媒体会话事件处理器
function registerMediaEvents() {
  if (!navigator.mediaSession) return;

  navigator.mediaSession.setActionHandler('play', () => {
    if (activeSongSha.value) {
      clickResume();
    } else {
      clickPlayByRandom();
    }
    updateMediaSessionMetadata();
  });

  navigator.mediaSession.setActionHandler('pause', clickPause);
  navigator.mediaSession.setActionHandler('previoustrack', clickPrev);
  navigator.mediaSession.setActionHandler('nexttrack', clickNext);

  updateMediaSessionMetadata();
}

// 刷新歌曲列表
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

    // 清理本地已删除的歌曲（仅当所有仓库都拉取成功时执行，避免接口失败导致误删）
    if (!fetchFailed) {
      for (let i = songList.value.length - 1; i >= 0; i -= 1) {
        const song = songList.value[i];
        if (!allRemoteSongs.find((o) => o.sha === song.sha)) {
          await musicDB.delete(song.sha);
          songList.value.splice(i, 1);
        }
      }
    }

    // 去重以 IndexedDB 为准：合并内存列表与库中已有 sha，
    // 避免「已入库但未显示」的歌曲被重复下载触发主键冲突
    const localSongs = await musicDB.get();
    const localShaSet = new Set([
      ...songList.value.map((s) => s.sha),
      ...localSongs.map((s) => s.sha),
    ]);
    const newSongs = allRemoteSongs.filter((o) => !localShaSet.has(o.sha));

    if (newSongs.length > 0 && isMeteredConnection()) {
      const ok = window.confirm(
        `当前检测到可能是蜂窝网络，即将下载 ${newSongs.length} 首新歌（约几十 MB），可能消耗移动流量。\n\n点击"确定"继续下载，点击"取消"仅更新列表不下载歌曲。`,
      );
      if (!ok) return;
    }
    for (let i = 0; i < newSongs.length / 5; i += 1) {
      const start = i * 5;
      const sliceSongs = newSongs.slice(start, start + 5);
      // 失败隔离：单首失败只跳过该首并记录日志，不影响同批及后续歌曲
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
  } finally {
    // 兜底复位：无论成功还是失败，加载状态都必须结束，避免刷新图标永久旋转
    songLoading.value = false;
  }
}

// ---- 播放控制 ----

// 顺序播放：在 displayedSongs 里往下走
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

// 智能随机：加权随机，排除冷却中的歌，按时段自动匹配
async function clickPlayByRandom() {
  playMode.value = 'random';
  const candidates = displayedSongs.value.filter((s) => !getSongState(s).isCooled);
  if (!candidates.length) return;

  const picked = songState.weightedPick(candidates, targetHour());
  if (!picked) return;

  await playSong(picked);
}

async function playSong(song) {
  // 记录上一首的播放事件
  if (activeSongSha.value && audioRef.value && audioRef.value.duration > 0) {
    const prev = songList.value.find((s) => s.sha === activeSongSha.value);
    if (prev && isFinite(audioRef.value.duration)) {
      const ratio = audioRef.value.currentTime / audioRef.value.duration;
      await songState.recordPlay(prev.sha, ratio);
    }
  }

  if (audioPlaying.value) {
    clickPause();
  }

  activeSongSha.value = song.sha;
  await nextTick();
  await clickResume();
  // 自然播完 → 按当前播放模式切下一首（播放事件由 playSong 切换时统一记录，避免重复）
  audioRef.value.onended = () => {
    if (playMode.value === 'random') {
      clickPlayByRandom();
    } else {
      clickPlayByOrder({ type: 'ended' });
    }
  };
}

async function clickSongBySha(sha) {
  const song = songList.value.find((s) => s.sha === sha);
  if (!song) return;

  // 如果点的是冷却中的歌 → 解冻而不是播放
  const st = getSongState(song);
  if (st.isCooled && activeSongSha.value !== sha) {
    await songState.unfreeze(sha);
    return;
  }

  await playSong(song);
}

async function clickResume() {
  await audioRef.value.play();
  audioPlaying.value = true;
  updateMediaSessionMetadata();
  updateDocumentTitle();
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function toAudioProgrssFrame() {
  if (!activeSongSha.value || !audioPlaying.value) return;
  audioProgress.value = audioRef.value.currentTime / audioRef.value.duration;
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function clickFooter() {
  const activeItem = document.querySelector('.song-item.active');
  if (activeItem) {
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clickPause() {
  audioRef.value.pause();
  audioPlaying.value = false;
  updateDocumentTitle();
}

function clickPrev() {
  // TODO
}

function clickNext() {
  // 手动切歌：按当前播放模式切，playSong 会按当前播放进度记录跳过事件
  if (playMode.value === 'random') {
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
  closeAction();
}

async function clickUnfreeze() {
  if (!actionSong.value) return;
  await songState.unfreeze(actionSong.value.sha);
  closeAction();
}

// ---- 编辑歌曲信息（手动修正）----

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
  }
  const song = songList.value.find((s) => s.sha === sha);
  if (song) {
    song.manualMeta = manualMeta;
    finalizeSongMeta(song);
    actionSong.value = song;
  }
  editingMeta.value = false;
}

async function resetEditMeta() {
  if (!actionSong.value) return;
  const sha = actionSong.value.sha;
  try {
    await musicDB.update(sha, { manualMeta: null });
  } catch (err) {
    console.error('清除手动修正失败:', err);
  }
  const song = songList.value.find((s) => s.sha === sha);
  if (song) {
    song.manualMeta = null;
    finalizeSongMeta(song);
    actionSong.value = song;
  }
  editingMeta.value = false;
}
</script>

<style scoped>
header {
  flex: 0 0 1.2rem;
  display: flex;
  align-items: center;
  background: #1e201e;
  overflow: hidden;

  .toolbar {
    display: flex;
    align-items: center;
    flex: auto;
    height: 100%;
    gap: 0.15rem;
    padding: 0 0.1rem;

      > .svg-icon {
      flex: 0 0 0.8rem;
      font-size: 0.35rem;
    }
  }

  .svg-icon__loading.loading {
    animation: 1s linear infinite loading;
  }

  .play-btns {
    display: inline-flex;
    gap: 0.15rem;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.08rem;
    border: 1px solid #555;
    padding: 0.1rem 0.2rem;
    border-radius: 0.08rem;
    color: #ccc;
    background: transparent;
    font-size: 0.24rem;
    white-space: nowrap;

    .svg-icon {
      font-size: 0.28rem;
    }
  }
}

.input-search {
  flex: auto;
  width: 0;
  padding: 0.04rem 0.1rem;
  border: none;
  border-radius: 0.04rem;
  color: #1e201e;
  font-size: 16px;
}

.search-close {
  flex: 0 0 1.2rem;
  font-size: 0.35rem;
  cursor: pointer;
}

.search-summary {
  flex: 0 0 auto;
  padding: 0.08rem 0.3rem;
  color: #999;
  font-size: 0.24rem;
  border-bottom: 1px solid #333;
}

.search-empty {
  text-align: center;
  padding: 1rem 0.4rem;
  color: #888;
  font-size: 0.28rem;

  .search-empty-title {
    margin-bottom: 0.15rem;
  }

  .search-empty-hint {
    color: #666;
    font-size: 0.24rem;
    line-height: 1.6;
  }
}

/* 搜索命中高亮（v-html 注入的 mark 不在模板作用域内，需 :deep） */
:deep(mark) {
  background: #697565;
  color: #fff;
  border-radius: 0.04rem;
  padding: 0 0.04rem;
}

/* 情绪开关：靠右 */
.mood-bar {
  display: inline-flex;
  gap: 0.05rem;
  margin-left: auto;
}

.mood-btn {
  padding: 0.06rem 0.1rem;
  border: none;
  background: transparent;
  font-size: 0.28rem;
  cursor: pointer;
  line-height: 1;
  border-radius: 0.08rem;

  &.active {
    background: #697565;
  }
}

.song-list {
  flex: auto;
  overflow: auto;
}

.song-item {
  display: flex;
  align-items: center;
  user-select: none;
  -webkit-user-select: none;

  &.active {
    background: #69756544;
  }

  &.cooled .song-name {
    color: #888;
  }
}

.cool-badge {
  display: inline-block;
  margin-left: 0.15rem;
  padding: 0.02rem 0.12rem;
  border-radius: 0.1rem;
  background: #444;
  color: #aaa;
  font-size: 0.22rem;
  vertical-align: middle;
}

.song-cover {
  width: 1rem;
  margin: 0.2rem 0.3rem;
  object-fit: contain;
}

.song-item {
  .song-info {
    flex: auto;
    width: 0;
    border-bottom: 1px solid #333;
  }

  .song-name {
    margin-top: 1em;
  }

  .song-author {
    padding-bottom: 1em;
    margin-top: 0.8em;
    font-size: 0.9em;
    color: #aaa;
  }
}

.to-top {
  position: fixed;
  bottom: 1.8rem;
  right: 0.4rem;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #ddd;
}

.svg-icon__to-top {
  font-size: 1.5em;
}

footer {
  flex: 0 0 1.2rem;
  display: flex;
  align-items: center;
  background: #697565;
}

footer {
  .song-cover {
    flex: none;
  }

  .song-info {
    flex: auto;
    width: 0;
    border-bottom: none;
  }

  .song-operate {
    flex: 0 0 1.6rem;
    margin-right: 0.25rem;
    display: inline-flex;
    justify-content: space-around;
  }

  .audio-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 0.04rem;
    background: #aaa;
    transform-origin: 0;
  }
}

footer .song-operate .svg-icon__play,
footer .song-operate .svg-icon__pause,
footer .song-operate .svg-icon__next {
  font-size: 2em;
}

/* 长按操作菜单 */
.action-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.action-sheet {
  width: 100%;
  background: #2a2c2a;
  border-radius: 0.2rem 0.2rem 0 0;
  padding: 0.4rem 0.3rem 0.5rem;
}

.action-title {
  font-size: 0.3rem;
  font-weight: 600;
  text-align: center;
}

.action-sub {
  font-size: 0.24rem;
  color: #999;
  text-align: center;
  margin-top: 0.08rem;
}

.action-buttons {
  display: flex;
  gap: 0.2rem;
  margin-top: 0.2rem;
}

.action-btn {
  flex: 1;
  padding: 0.2rem;
  border-radius: 0.1rem;
  border: none;
  font-size: 0.26rem;
  cursor: pointer;

  &.cool {
    background: #8b6f47;
    color: #fff;
  }

  &.unfreeze {
    background: #5a7a5a;
    color: #fff;
  }

  &.edit {
    background: #4a5a6a;
    color: #fff;
  }

  &.save {
    background: #5a7a5a;
    color: #fff;
  }

  &.reset {
    background: #444;
    color: #ccc;
  }

  &.close {
    background: #444;
    color: #ccc;
  }
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0.3rem 0 0.2rem;

  label {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    font-size: 0.24rem;
    color: #aaa;

    span {
      flex: 0 0 0.6rem;
    }

    input {
      flex: 1;
      min-width: 0;
      padding: 0.1rem 0.15rem;
      border: 1px solid #555;
      border-radius: 0.08rem;
      background: #1e201e;
      color: #eee;
      font-size: 0.26rem;
    }
  }
}

@keyframes loading {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
