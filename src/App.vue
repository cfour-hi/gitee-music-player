<template>
  <header>
    <div v-show="!searching" class="toolbar">
      <svg-icon
        name="loading"
        :class="{ loading: loading }"
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
  <div class="song-list">
    <div
      v-for="(song, index) in songList"
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
import useMusicDB from './hooks/use-music-db';
import useSongParse from './hooks/use-song-parse';
import useMusicSearch from './hooks/use-music-search';
import { computed, nextTick, onMounted, ref } from 'vue';

const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;
const OWNER = import.meta.env.VITE_OWNER;
const REPO = import.meta.env.VITE_REPO;
const BRANCH = import.meta.env.PROD ? import.meta.env.VITE_BRANCH : 'dev';

const loading = ref(false);

const songList = ref([]);
const songListSorted = computed(() =>
  songList.value.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  ),
);
const songActiveIndex = ref(-1);
const songActive = computed(() => songListSorted.value[songActiveIndex.value]);

const audioRef = ref(null);
const audioPlaying = ref(false);
const audioProgress = ref(0);

const musicDB = useMusicDB();
const { searchRef, searching, searchContent, clickSearch, blurSearchInput } =
  useMusicSearch();
const { resolveSongData, resolveSongTag, toSongCover } = useSongParse();

onMounted(async () => {
  loading.value = true;
  await musicDB.connect();
  await resolveSongsFromLocal();
  loading.value = false;
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

async function clickRefresh() {
  if (loading.value) return;
  loading.value = true;

  const res = await fetch(
    `https://gitee.com/api/v5/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?access_token=${ACCESS_TOKEN}`,
  );
  const data = await res.json();

  for (let i = songList.value.length - 1; i >= 0; i -= 1) {
    const song = songList.value[i];
    if (data.tree.find((o) => o.sha === song.sha)) continue;
    await musicDB.delete(song.sha);
    songList.value.splice(i, 1);
  }

  const newSongs = data.tree.filter(
    (o) => !songList.value.find((p) => p.sha === o.sha),
  );
  for (let i = 0; i < newSongs.length / 10; i += 1) {
    const start = i * 10;
    const sliceSongs = newSongs.slice(start, start + 10);
    await Promise.all(sliceSongs.map(resolveSongData));
    songList.value.push(...sliceSongs);
  }
  loading.value = false;
}

async function clickPlayByOrder(evt) {
  let index = 0;
  if (
    (!evt || evt.type === 'ended') &&
    songActiveIndex.value < songList.value.length - 1
  ) {
    index = songActiveIndex.value + 1;
  }
  await clickSong(index);
}

async function clickPlayByRandom() {
  const index = Math.floor(Math.random() * songList.value.length);
  await clickSong(index);
  audioRef.value.onended = clickPlayByRandom;
}

function showSong(song) {
  if (!searchContent.value) return true;
  const { title, artist } = song._tag.tags;
  return (
    title.includes(searchContent.value) || artist.includes(searchContent.value)
  );
}

async function clickSong(index) {
  if (songActiveIndex.value >= 0 && audioPlaying.value) {
    clickPause();
    audioRef.value.currentTime = 0;
  }
  songActiveIndex.value = index;
  await nextTick();
  await clickResume();
  audioRef.value.onended = clickPlayByOrder;
}

async function clickResume() {
  await audioRef.value.play();
  audioPlaying.value = true;
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

function clickNext() {
  if (audioRef.value.onended) {
    return audioRef.value.onended();
  }
  clickPlayByOrder();
}
</script>

<style scoped>
header {
  display: flex;
  align-items: center;
  height: 0.64rem;
}

header .toolbar {
  display: flex;
  align-items: center;
  flex: auto;
  height: 100%;
}

header .toolbar > .svg-icon {
  flex: 0 0 0.64rem;
  padding: 0.2rem 0;
  font-size: 0.24rem;
}

header .svg-icon__loading.loading {
  animation: 1s linear infinite loading;
}

header .play-btns {
  flex: auto;
  display: inline-flex;
  justify-content: center;
  gap: 0.32rem;
}

header button {
  display: inline-flex;
  align-items: center;
  gap: 0.08rem;
  border: 1px solid #666;
  padding: 0.08rem;
  border-radius: 0.04rem;
  color: currentColor;
  background: transparent;
}

header button .svg-icon {
  font-size: 0.18rem;
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
  margin-bottom: 0.8rem;
}

.song-item {
  display: flex;
  align-items: center;
}

.song-item.active {
  background: #69756544;
}

.song-cover {
  width: 0.56rem;
  margin: 0 0.16rem;
  object-fit: contain;
}

.song-item .song-info {
  flex: auto;
  width: 0;
  padding: 0.16rem 0;
  border-bottom: 1px solid #333;
}

.song-info .song-name {
  margin-bottom: 0.08rem;
}

.song-info .song-author {
  font-size: 0.14rem;
  color: #aaa;
}

footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0.8rem;
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
  flex: 0 0 0.96rem;
  margin-right: 0.16rem;
  display: inline-flex;
  justify-content: space-around;
}

footer .song-operate .svg-icon__play,
footer .song-operate .svg-icon__pause,
footer .song-operate .svg-icon__next {
  font-size: 0.32rem;
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
