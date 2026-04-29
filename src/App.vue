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
      placeholder="搜索歌曲、歌手、专辑"
      @blur="blurSearchInput"
    />
    <svg-icon v-show="searching" name="close" class="search-close" @click="closeSearch"></svg-icon>
  </header>
  <main class="song-list">
    <div
      v-for="song in filteredSongs"
      :key="song.sha"
      class="song-item"
      :class="{ active: songListSorted.indexOf(song) === songActiveIndex }"
      @click="clickSong(songListSorted.indexOf(song))"
    >
      <img :src="song._cover || ''" class="song-cover" />
      <div class="song-info">
        <div class="song-name ellipsis">
          {{ song._tag && song._tag.tags.title }}
        </div>
        <div class="song-author ellipsis">
          {{ song._tag && song._tag.tags.artist }}
        </div>
      </div>
    </div>
    <div v-if="filteredSongs.length === 0 && searchContent" class="search-empty">
      没有找到「{{ searchContent }}」相关的歌曲
    </div>
  </main>
  <footer v-if="songActive" @click="clickFooter">
    <div
      class="audio-progress"
      :style="{ transform: `scaleX(${audioProgress})` }"
    >
      <audio ref="audioRef" :src="songActive._src"></audio>
    </div>
    <img :src="songActive._cover || ''" class="song-cover" />
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
</template>

<script setup>
import useSong from './hooks/use-song';
import useMusicDB from './hooks/use-music-db';
import useSongParse from './hooks/use-song-parse';
import useMusicSearch from './hooks/use-music-search';
import { nextTick, onMounted, ref } from 'vue';
import { isAudio } from './helper'

const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;
const OWNER = import.meta.env.VITE_OWNER;
const REPOS = import.meta.env.VITE_REPOS.split(',');
const BRANCH = import.meta.env.PROD ? import.meta.env.VITE_BRANCH : 'dev';

const { songLoading, songList, songListSorted, songActiveIndex, songActive } = useSong();

const audioRef = ref(null);
const audioPlaying = ref(false);
const audioProgress = ref(0);

const musicDB = useMusicDB();
const { searchRef, searching, searchContent, filteredSongs, clickSearch, closeSearch, blurSearchInput } =
  useMusicSearch(songListSorted);
const { resolveSongData, resolveSongTag, toSongCover, parseSongInfo } = useSongParse();

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
    
    // 从文件名解析歌曲信息，如果成功则覆盖标签信息
    const parsedInfo = parseSongInfo(song.path);
    if (parsedInfo) {
      song._tag.tags.title = parsedInfo.title;
      song._tag.tags.artist = parsedInfo.artist;
    }
  }
  songList.value = songs;
}

// 更新媒体会话元数据
function updateMediaSessionMetadata() {
  if (!navigator.mediaSession) return;
  if (!songActive.value || !songActive.value._tag) return;

  const metadata = new MediaMetadata({
    title: songActive.value._tag.tags.title,
    artist: songActive.value._tag.tags.artist,
    album: songActive.value._tag.tags.album || '未知专辑',
    artwork: songActive.value._cover ? [
      {
        src: songActive.value._cover,
        sizes: '512x512',
        type: songActive.value._tag.tags.picture?.format || 'image/jpeg',
      },
    ] : [],
  });
  navigator.mediaSession.metadata = metadata;
}

// 更新浏览器标签页标题
function updateDocumentTitle() {
  if (!songActive.value || !songActive.value._tag) {
    document.title = 'Music';
    return;
  }

  const title = songActive.value._tag.tags.title;
  const artist = songActive.value._tag.tags.artist;
  const playingIcon = audioPlaying.value ? '🎵' : '⏸️';
  
  document.title = `${playingIcon} ${title} - ${artist}`;
}

// 注册媒体会话事件处理器，用于集成浏览器媒体控制（如系统媒体快捷键、通知中心播放控件等）
function registerMediaEvents() {
  // 检测浏览器是否支持 MediaSession API，不支持则直接返回
  if (!navigator.mediaSession) return;

  // 设置 "播放" 动作处理器
  navigator.mediaSession.setActionHandler('play', () => {
    // 如果已有活跃歌曲，恢复播放；否则触发随机播放
    if (songActiveIndex.value >= 0) {
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

// 刷新歌曲列表函数：从多个远程仓库同步最新歌曲数据，更新本地数据库和歌曲列表
async function clickRefresh() {
  if (songLoading.value) return;
  songLoading.value = true;

  // 从所有仓库获取歌曲列表
  const allRemoteSongs = (await Promise.all(REPOS.map(async repo => {
    try {
      const res = await fetch(`https://gitee.com/api/v5/repos/${OWNER}/${repo}/git/trees/${BRANCH}?access_token=${ACCESS_TOKEN}`);
      const data = await res.json();
      return data.tree.filter(isAudio);
    } catch(err) {
      console.log(`从仓库"${repo}"获取歌曲列表失败`)
    }
    return [];
  }))).flat();

  // 清理本地已删除的歌曲：反向遍历当前歌曲列表（避免删除时索引错乱）
  for (let i = songList.value.length - 1; i >= 0; i -= 1) {
    const song = songList.value[i];
    // 如果远程仓库中不存在当前歌曲（通过 SHA 唯一标识判断），则删除本地数据
    if (!allRemoteSongs.find((o) => o.sha === song.sha)) {
      await musicDB.delete(song.sha);
      songList.value.splice(i, 1);
    }
  }

  // 筛选远程仓库中的新歌曲：排除已存在于本地列表的歌曲
  const newSongs = allRemoteSongs.filter(
    (o) => !songList.value.find((p) => p.sha === o.sha),
  );
  // 批量处理新歌曲（每批10首，避免请求过于密集）
  for (let i = 0; i < newSongs.length / 5; i += 1) {
    const start = i * 5;
    const sliceSongs = newSongs.slice(start, start + 5);
    // 并行处理当前批次的歌曲：解析歌曲数据并添加到本地数据库
    const resolvedSongs = await Promise.all(
      sliceSongs.map(async (song) => {
        const blob = await resolveSongData(song);
        await musicDB.add({
          blob,
          path: song.path,
          sha: song.sha,
          url: song.url,
        });
        return song;
      }),
    );
    songList.value.push(...resolvedSongs);
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
  // 更新媒体会话元数据
  updateMediaSessionMetadata();
  // 更新浏览器标签页标题
  updateDocumentTitle();
  // 请求动画帧更新音频进度条（启动实时进度更新循环）
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function toAudioProgrssFrame() {
  if (songActiveIndex.value < 0 || !audioPlaying.value) return;
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
  // 更新标签页标题为暂停状态
  updateDocumentTitle();
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
  document.querySelector('.song-list').scrollTo({ top: 0, behavior: 'smooth' });
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

      > .svg-icon {
      flex: 0 0 1.2rem;
      font-size: 0.35rem;
    } 
  }

  .svg-icon__loading.loading {
    animation: 1s linear infinite loading;
  }

  .play-btns {
    flex: auto;
    display: inline-flex;
    justify-content: center;
    gap: 0.3rem;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    border: 1px solid #666;
    padding: 0.15rem;
    border-radius: 0.1rem;
    color: currentColor;
    background: transparent;

    .svg-icon {
      font-size: 0.3rem;
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

.search-empty {
  text-align: center;
  padding: 1rem 0;
  color: #888;
  font-size: 0.28rem;
}

.song-list {
  flex: auto;
  overflow: auto;
}

.song-item {
  display: flex;
  align-items: center;

  &.active {
    background: #69756544;
  }
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

@keyframes loading {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
