<template>
  <header>
    <button class="play-order" @click="clickPlayByOrder">
      <svg-icon name="play"></svg-icon>
      顺序播放
    </button>
    <button class="play-random" @click="clickPlayByRandom">
      <svg-icon name="play-random"></svg-icon>
      随机播放
    </button>
  </header>
  <div class="music-list">
    <div
      v-for="(music, index) in musicList"
      :key="music.sha"
      class="music-item"
      :class="{ active: index === musicActiveIndex }"
      @click="clickPlay(index)"
    >
      <img :src="music._cover" class="music-cover" />
      <div class="music-info">
        <div class="music-name">
          {{ music._tag && music._tag.tags.title }}
        </div>
        <div class="music-author">
          {{ music._tag && music._tag.tags.artist }}
        </div>
      </div>
    </div>
  </div>
  <footer v-if="musicActive">
    <div
      class="audio-progress"
      :style="{ transform: `scaleX(${audioProgress})` }"
    >
      <audio ref="audioRef" :src="musicActive._src"></audio>
    </div>
    <img :src="musicActive._cover" class="music-cover" />
    <div class="music-info">
      <div class="music-name">
        {{ musicActive._tag.tags.title }}
      </div>
      <div class="music-author">
        {{ musicActive._tag.tags.artist }}
      </div>
    </div>
    <div class="music-operate">
      <svg-icon
        v-show="!musicPlaying"
        name="play"
        @click="clickResume"
      ></svg-icon>
      <svg-icon
        v-show="musicPlaying"
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

const audioRef = ref(null);
const musicList = ref([]);
const musicActiveIndex = ref(-1);
const musicPlaying = ref(false);
const musicActive = computed(() => musicList.value[musicActiveIndex.value]);
const audioProgress = ref(0);

const musicDB = useMusicDB();

onMounted(async () => {
  await resolveMusics();
});

async function resolveMusics() {
  const res = await fetch(
    `https://gitee.com/api/v5/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?access_token=${ACCESS_TOKEN}`,
  );
  const data = await res.json();

  for (let i = 0; i < data.tree.length / 10; i += 1) {
    const sliceMusics = data.tree.slice(i * 10, i * 10 + 9);
    await Promise.all(sliceMusics.map(resolveMusicData));
  }
  musicList.value = data.tree;
}

async function resolveMusicData(music) {
  const _music = await musicDB.get(music.sha);
  let blob;
  if (_music) {
    blob = _music.blob;
  } else {
    blob = await resolveMusicBlob(music);
    await musicDB.add({
      blob,
      sha: music.sha,
      url: music.url,
    });
  }
  music._tag = await resolveMusicTag(blob);
  music._cover = URL.createObjectURL(toMusicCoverBlob(music._tag));
  music._src = URL.createObjectURL(blob);
}

async function clickPlay(index) {
  if (musicActiveIndex.value >= 0 && musicPlaying.value) resetMusic();
  musicActiveIndex.value = index;
  await nextTick();
  await clickResume();
}

async function clickPlayByOrder(evt) {
  let index = 0;
  if (
    (!evt || evt.type === 'ended') &&
    musicActiveIndex.value < musicList.value.length - 1
  ) {
    index = musicActiveIndex.value + 1;
  }
  await clickPlay(index);
  audioRef.value.onended = clickPlayByOrder;
}

async function clickPlayByRandom() {
  const index = Math.floor(Math.random() * musicList.value.length);
  await clickPlay(index);
  audioRef.value.onended = clickPlayByRandom;
}

async function clickResume() {
  await audioRef.value.play();
  musicPlaying.value = true;
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function clickPause() {
  audioRef.value.pause();
  musicPlaying.value = false;
}

function clickNext() {
  if (audioRef.value.onended) {
    return audioRef.value.onended();
  }
  clickPlayByOrder();
}

function resetMusic() {
  clickPause();
  audioRef.value.currentTime = 0;
}

function resolveMusicTag(blob) {
  return new Promise((resolve, reject) => {
    window.jsmediatags.read(blob, {
      onSuccess: resolve,
      onError: reject,
    });
  });
}

async function resolveMusicBlob(music) {
  const res = await fetch(`${music.url}?access_token=${ACCESS_TOKEN}`);
  const resData = await res.json();
  const binaryData = atob(resData.content);
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }
  return new Blob([uint8Array], { type: 'audio/mp3' });
}

function toMusicCoverBlob(musicTag) {
  const { data, format } = musicTag.tags.picture;
  return new Blob([new Uint8Array(data), { type: format }]);
}

function toAudioProgrssFrame() {
  if (musicActiveIndex.value < 0 || !musicPlaying.value) return;
  audioProgress.value = audioRef.value.currentTime / audioRef.value.duration;
  window.requestAnimationFrame(toAudioProgrssFrame);
}
</script>

<style scoped>
header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3em;
  height: 4em;
}

header button {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  border: 1px solid #666;
  padding: 0.5em 1em;
  border-radius: 0.25em;
  color: currentColor;
  background: transparent;
}

.music-list {
  margin-bottom: 4em;
}

.music-item {
  display: flex;
  align-items: center;
}

.music-item.active {
  background: #69756544;
}

.music-item .music-cover {
  width: 4em;
  margin: 0 1em;
}

.music-item .music-info {
  flex: auto;
  padding: 1.5em 0;
  border-bottom: 1px solid #333;
}

.music-info .music-name {
  margin-bottom: 0.5em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.1em;
}

.music-info .music-author {
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

footer .music-cover {
  flex: none;
  margin: 0 1em;
  width: 4em;
}

footer .music-info {
  flex: none;
  width: calc(100% - 13em);
  border-bottom: none;
}

footer .music-operate {
  flex: 0 0 6em;
  display: inline-flex;
  justify-content: space-around;
}

footer .music-operate .svg-icon__play,
footer .music-operate .svg-icon__pause,
footer .music-operate .svg-icon__next {
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
