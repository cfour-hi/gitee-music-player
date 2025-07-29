<template>
  <header>
    <div v-show="!searching" class="toolbar">
      <svg-icon
        name="loading"
        :class="{ loading: songLoading }"
        @click="clickRefresh"
      ></svg-icon>
      <div v-if="songList.length > 0" class="play-btns">
        <button @click="clickPlayByOrder">
          <svg-icon name="play"></svg-icon>
          顺序播放
        </button>
        <button @click="clickPlayByRandom">
          <svg-icon name="play-random"></svg-icon>
          随机播放
        </button>
      </div>
      <svg-icon name="search" @click="clickSearch"></svg-icon>
    </div>
    <input
      v-show="searching"
      v-model="searchContent"
      ref="searchRef"
      type="text"
      class="input-search"
      @blur="blurSearchInput"
    />
  </header>
  <main class="song-list">
    <div
      v-for="(song, index) in songListSorted"
      :key="song.sha"
      class="song-item"
      :class="{ active: index === songActiveIndex }"
      v-show="showSong(song)"
      @click="clickSong(index)"
    >
      <img :src="song._cover" class="song-cover" />
      <div class="song-info">
        <div class="song-name ellipsis">
          {{ song._tag && song._tag.tags.title }}
        </div>
        <div class="song-author ellipsis">
          {{ song._tag && song._tag.tags.artist }}
        </div>
      </div>
    </div>
  </main>
  <div class="to-top" @click="clickToTop">
    <svg-icon name="to-top"></svg-icon>
  </div>
  <footer v-if="songActive">
    <div
      class="audio-progress"
      :style="{ transform: `scaleX(${audioProgress})` }"
    >
      <audio ref="audioRef" :src="songActive._src"></audio>
    </div>
    <img :src="songActive._cover" class="song-cover" />
    <div class="song-info">
      <div class="song-name ellipsis">
        {{ songActive._tag.tags.title }}
      </div>
      <div class="song-author ellipsis">
        {{ songActive._tag.tags.artist }}
      </div>
    </div>
    <div class="song-operate">
      <svg-icon
        v-show="!audioPlaying"
        name="play"
        @click="clickResume"
      ></svg-icon>
      <svg-icon
        v-show="audioPlaying"
        name="pause"
        @click="clickPause"
      ></svg-icon>
      <svg-icon name="next" @click="clickNext"></svg-icon>
    </div>
  </footer>
</template>

<script setup>
import useSong from './hooks/use-song';
import useMusicDB from './hooks/use-music-db';
import useSongParse from './hooks/use-song-parse';
import useMusicSearch from './hooks/use-music-search';
import { computed, nextTick, onMounted, ref } from 'vue';

const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;
const OWNER = import.meta.env.VITE_OWNER;
const REPO = import.meta.env.VITE_REPO;
const BRANCH = import.meta.env.PROD ? import.meta.env.VITE_BRANCH : 'dev';

const { songLoading, songList, songListSorted, songActiveIndex, songActive } =
  useSong();

const audioRef = ref(null);
const audioPlaying = ref(false);
const audioProgress = ref(0);

const musicDB = useMusicDB();
const { searchRef, searching, searchContent, clickSearch, blurSearchInput } =
  useMusicSearch();
const { resolveSongData, resolveSongTag, toSongCover } = useSongParse();

onMounted(async () => {
  songLoading.value = true;
  await musicDB.connect();
  await resolveSongsFromLocal();
  songLoading.value = false;

  registerMediaEvents();
});

async function resolveSongsFromLocal() {
  const songs = await musicDB.get();
  for (const song of songs) {
    song._tag = await resolveSongTag(song.blob);
    song._cover = toSongCover(song._tag);
    song._src = URL.createObjectURL(song.blob);
  }
  songList.value = songs;
}

// 注册媒体会话事件处理器，用于集成浏览器媒体控制（如系统媒体快捷键、通知中心播放控件等）
function registerMediaEvents() {
  // 检测浏览器是否支持 MediaSession API，不支持则直接返回
  if (!navigator.mediaSession) return;

  // 更新媒体会话元数据
  function updateMediaSessionMetadata() {
    if (!songActive || !songActive._tag) return;

    const metadata = new MediaMetadata({
      title: songActive._tag.tags.title,
      artist: songActive._tag.tags.artist,
      album: songActive._tag.tags.album || '未知专辑',
      artwork: [
        {
          src: songActive._cover,
          sizes: '512x512',
          type: songActive._tag.tags.picture?.format || 'image/jpeg',
        },
      ],
    });
    navigator.mediaSession.metadata = metadata;
  }

  // 设置 "播放" 动作处理器
  navigator.mediaSession.setActionHandler('play', () => {
    // 如果已有活跃歌曲且处于播放状态，恢复播放；否则触发随机播放
    if (songActiveIndex.value >= 0 && audioPlaying.value) {
      clickResume();
    } else {
      clickPlayByRandom();
    }
    updateMediaSessionMetadata();
  });

  // 设置 "暂停" 动作处理器，直接调用暂停函数
  navigator.mediaSession.setActionHandler('pause', clickPause);
  // 设置 "上一曲" 动作处理器（当前为 TODO 状态）
  navigator.mediaSession.setActionHandler('previoustrack', clickPrev);
  // 设置 "下一曲" 动作处理器，调用下一曲函数
  navigator.mediaSession.setActionHandler('nexttrack', clickNext);

  updateMediaSessionMetadata();
}

// 刷新歌曲列表函数：从远程仓库同步最新歌曲数据，更新本地数据库和歌曲列表
async function clickRefresh() {
  if (songLoading.value) return;
  songLoading.value = true;

  const res = await fetch(
    `https://gitee.com/api/v5/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?access_token=${ACCESS_TOKEN}`,
  );
  const data = await res.json();

  // 清理本地已删除的歌曲：反向遍历当前歌曲列表（避免删除时索引错乱）
  for (let i = songList.value.length - 1; i >= 0; i -= 1) {
    const song = songList.value[i];
    // 如果远程仓库中不存在当前歌曲（通过 SHA 唯一标识判断），则删除本地数据
    if (data.tree.find((o) => o.sha === song.sha)) continue;

    await musicDB.delete(song.sha);
    songList.value.splice(i, 1);
  }

  // 筛选远程仓库中的新歌曲：排除已存在于本地列表的歌曲
  const newSongs = data.tree.filter(
    (o) => !songList.value.find((p) => p.sha === o.sha),
  );
  // 批量处理新歌曲（每批10首，避免请求过于密集）
  for (let i = 0; i < newSongs.length / 10; i += 1) {
    const start = i * 10;
    const sliceSongs = newSongs.slice(start, start + 10);
    // 并行处理当前批次的歌曲：解析歌曲数据并添加到本地数据库
    await Promise.all(
      sliceSongs.map(async (song) => {
        const blob = await resolveSongData(song);
        return musicDB.add({
          blob,
          path: song.path,
          sha: song.sha,
          url: song.url,
        });
      }),
    );
    songList.value.push(...sliceSongs);
  }
  songLoading.value = false;
}

// 顺序播放处理函数
async function clickPlayByOrder(evt) {
  let index = 0;
  // 判断条件：如果没有事件触发或事件类型是歌曲播放结束，且当前活跃歌曲索引不是最后一首
  if (
    (!evt || evt.type === 'ended') &&
    songActiveIndex.value < songList.value.length - 1
  ) {
    index = songActiveIndex.value + 1;
  }
  await clickSong(index);
}

// 随机播放处理函数
async function clickPlayByRandom() {
  const index = Math.floor(Math.random() * songList.value.length);
  await clickSong(index);
  audioRef.value.onended = clickPlayByRandom;
}

// 歌曲搜索过滤函数：根据搜索内容决定是否显示当前歌曲
function showSong(song) {
  if (!searchContent.value) return true;

  const { title, artist } = song._tag.tags;
  // 检查标题或艺术家是否包含搜索内容（大小写敏感）
  return (
    title.includes(searchContent.value) || artist.includes(searchContent.value)
  );
}

// 歌曲点击播放处理函数，根据索引播放指定歌曲
async function clickSong(index) {
  // 如果当前有活跃歌曲且正在播放，先暂停当前播放并重置进度
  if (songActiveIndex.value >= 0 && audioPlaying.value) {
    clickPause();
    audioRef.value.currentTime = 0;
  }
  songActiveIndex.value = index;
  // 等待DOM更新完成（确保新的songActive已渲染）
  await nextTick();
  await clickResume();
  audioRef.value.onended = clickPlayByOrder;
}

// 恢复音频播放功能，继续播放当前暂停的歌曲
async function clickResume() {
  await audioRef.value.play();
  audioPlaying.value = true;
  // 请求动画帧更新音频进度条（启动实时进度更新循环）
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function toAudioProgrssFrame() {
  if (songActiveIndex.value < 0 || !audioPlaying.value) return;
  audioProgress.value = audioRef.value.currentTime / audioRef.value.duration;
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function clickPause() {
  audioRef.value.pause();
  audioPlaying.value = false;
}

function clickPrev() {
  // TODO
}

function clickNext() {
  if (audioRef.value.onended) {
    return audioRef.value.onended();
  }
  clickPlayByOrder();
}

function clickToTop() {
  document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<style scoped>
header {
  display: flex;
  align-items: center;
  height: 1.2rem;
}

header .toolbar {
  display: flex;
  align-items: center;
  flex: auto;
  height: 100%;
}

header .toolbar > .svg-icon {
  flex: 0 0 1.2rem;
  padding: 0.4rem 0;
  font-size: 0.35rem;
}

header .svg-icon__loading.loading {
  animation: 1s linear infinite loading;
}

header .play-btns {
  flex: auto;
  display: inline-flex;
  justify-content: center;
  gap: 0.3rem;
}

header button {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  border: 1px solid #666;
  padding: 0.15rem;
  border-radius: 0.1rem;
  color: currentColor;
  background: transparent;
}

header button .svg-icon {
  font-size: 0.3rem;
}

.input-search {
  box-sizing: border-box;
  width: calc(100% - 0.32rem);
  padding: 0.04rem;
  border: none;
  border-radius: 0.04rem;
  margin: 0 0.16rem;
  color: #1e201e;
}

.song-list {
  margin-bottom: 1.4rem;
}

.song-item {
  display: flex;
  align-items: center;
}

.song-item.active {
  background: #69756544;
}

.song-cover {
  width: 1rem;
  margin: 0.2rem 0.3rem;
  object-fit: contain;
}

.song-item .song-info {
  flex: auto;
  width: 0;
  border-bottom: 1px solid #333;
}

.song-info .song-name {
  margin-top: 1em;
}

.song-info .song-author {
  padding-bottom: 1em;
  margin-top: 0.8em;
  font-size: 0.9em;
  color: #aaa;
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
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #697565;
  display: flex;
  align-items: center;
}

footer .song-cover {
  flex: none;
}

footer .song-info {
  flex: auto;
  width: 0;
  border-bottom: none;
}

footer .song-operate {
  flex: 0 0 1.6rem;
  margin-right: 0.25rem;
  display: inline-flex;
  justify-content: space-around;
}

footer .song-operate .svg-icon__play,
footer .song-operate .svg-icon__pause,
footer .song-operate .svg-icon__next {
  font-size: 2em;
}

footer .audio-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 0.04rem;
  background: #aaa;
  transform-origin: 0;
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
