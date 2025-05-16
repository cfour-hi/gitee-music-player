<template>
  <header>
    <svg-icon name="refresh" @click="clickRefresh"></svg-icon>
    <button @click="clickPlayByOrder">
      <svg-icon name="play"></svg-icon>
      顺序播放
    </button>
    <button @click="clickPlayByRandom">
      <svg-icon name="play-random"></svg-icon>
      随机播放
    </button>
  </header>
  <div class="song-list">
    <div
      v-for="(song, index) in songList"
      :key="song.sha"
      class="song-item"
      :class="{ active: index === songActiveIndex }"
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
        v-show="!songPlaying"
        name="play"
        @click="clickResume"
      ></svg-icon>
      <svg-icon
        v-show="songPlaying"
        name="pause"
        @click="clickPause"
      ></svg-icon>
      <svg-icon name="next" @click="clickNext"></svg-icon>
    </div>
  </footer>
</template>

<script setup>
import useMusicDB from './hooks/use-musics-db';
import { computed, nextTick, onMounted, ref } from 'vue';

const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;
const OWNER = import.meta.env.VITE_OWNER;
const REPO = import.meta.env.VITE_REPO;
const BRANCH = import.meta.env.VITE_BRANCH;

const songList = ref([]);
const songActiveIndex = ref(-1);
const songPlaying = ref(false);
const songActive = computed(() => songList.value[songActiveIndex.value]);

const audioRef = ref(null);
const audioProgress = ref(0);

const musicDB = useMusicDB();

onMounted(async () => {
  await musicDB.connect();
  await resolveSongsFromLocal();
  // await resolveSongs();
});

async function resolveSongsFromLocal() {
  const songs = await musicDB.get();
  for (const song of songs) {
    song._tag = await resolveSongTag(song.blob);
    song._cover = URL.createObjectURL(toSongCoverBlob(song._tag));
    song._src = URL.createObjectURL(song.blob);
  }
  songList.value = songs;
}

async function resolveSongs() {
  const res = await fetch(
    `https://gitee.com/api/v5/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?access_token=${ACCESS_TOKEN}`,
  );
  const data = await res.json();

  for (let i = 0; i < data.tree.length / 10; i += 1) {
    const start = i * 10;
    const sliceSongs = data.tree.slice(start, start + 10);
    await Promise.all(sliceSongs.map(resolveSongData));
    songList.value.push(...sliceSongs);
  }
}

async function resolveSongData(song) {
  const _song = await musicDB.get(song.sha);
  let blob;
  if (_song) {
    blob = _song.blob;
  } else {
    blob = await resolveSongBlob(song);
    await musicDB.add({
      blob,
      sha: song.sha,
      url: song.url,
    });
  }
  song._tag = await resolveSongTag(blob);
  song._cover = URL.createObjectURL(toSongCoverBlob(song._tag));
  song._src = URL.createObjectURL(blob);
}

async function clickSong(index) {
  if (songActiveIndex.value >= 0 && songPlaying.value) resetSong();
  songActiveIndex.value = index;
  await nextTick();
  await clickResume();
}

async function clickRefresh() {
  // TODO
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
  audioRef.value.onended = clickPlayByOrder;
}

async function clickPlayByRandom() {
  const index = Math.floor(Math.random() * songList.value.length);
  await clickSong(index);
  audioRef.value.onended = clickPlayByRandom;
}

async function clickResume() {
  await audioRef.value.play();
  songPlaying.value = true;
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function clickPause() {
  audioRef.value.pause();
  songPlaying.value = false;
}

function clickNext() {
  if (audioRef.value.onended) {
    return audioRef.value.onended();
  }
  clickPlayByOrder();
}

function resetSong() {
  clickPause();
  audioRef.value.currentTime = 0;
}

function resolveSongTag(blob) {
  return new Promise((resolve, reject) => {
    window.jsmediatags.read(blob, {
      onSuccess: resolve,
      onError: reject,
    });
  });
}

async function resolveSongBlob(song) {
  const res = await fetch(`${song.url}?access_token=${ACCESS_TOKEN}`);
  const resData = await res.json();
  const binaryData = atob(resData.content);
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }
  return new Blob([uint8Array], { type: 'audio/mp3' });
}

function toSongCoverBlob(songTag) {
  const { data, format } = songTag.tags.picture;
  return new Blob([new Uint8Array(data), { type: format }]);
}

function toAudioProgrssFrame() {
  if (songActiveIndex.value < 0 || !songPlaying.value) return;
  audioProgress.value = audioRef.value.currentTime / audioRef.value.duration;
  window.requestAnimationFrame(toAudioProgrssFrame);
}
</script>

<style scoped>
header {
  display: flex;
  align-items: center;
  height: 4em;
}

header .svg-icon__refresh {
  margin-left: 2em;
}

header button {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  border: 1px solid #666;
  padding: 0.5em 1em;
  border-radius: 0.25em;
  margin-left: 2em;
  color: currentColor;
  background: transparent;
}

.song-list {
  margin-bottom: 5em;
}

.song-item {
  display: flex;
  align-items: center;
}

.song-item.active {
  background: #69756544;
}

.song-cover {
  width: 3.5em;
  margin: 0 1em;
}

.song-item .song-info {
  flex: auto;
  width: 0;
  padding: 1em 0;
  border-bottom: 1px solid #333;
}

.song-info .song-name {
  margin-bottom: 0.5em;
  font-size: 1em;
}

.song-info .song-author {
  font-size: 0.85em;
  color: #aaa;
}

footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 5em;
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
  flex: 0 0 6em;
  margin-right: 1em;
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
  height: 0.25em;
  background: #aaa;
  transform-origin: 0;
}
</style>
