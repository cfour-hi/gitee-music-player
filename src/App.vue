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
      <svg-icon name="music"></svg-icon>
      <div class="music-info">
        <div class="music-name">
          {{ toMusicName(music) }}
        </div>
        <div class="music-author">
          {{ toMusicAuthor(music) }}
        </div>
      </div>
      <audio v-if="music._src" :id="music.sha" :src="music._src"></audio>
      <svg-icon
        v-show="index === musicActiveIndex"
        name="music-rhythm"
      ></svg-icon>
    </div>
  </div>
  <footer v-if="musicActiveIndex >= 0">
    <div
      class="audio-progress"
      :style="{ transform: `scaleX(${audioProgress})` }"
    ></div>
    <svg-icon name="music1"></svg-icon>
    <div class="music-info">
      <div class="music-name">
        {{ toMusicName() }}
      </div>
      <div class="music-author">
        {{ toMusicAuthor() }}
      </div>
    </div>
    <div class="music-operate">
      <svg-icon
        v-show="!musicPlaying"
        name="play"
        @click="clickContinue"
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

const musicList = ref([]);
const musicActiveIndex = ref(-1);
const musicPlaying = ref(false);
const musicActive = computed(() => musicList.value[musicActiveIndex.value]);
const audioEls = {};
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
  musicList.value = data.tree.map((o) => ({ ...o, _src: undefined }));
}

async function clickPlay(index) {
  if (musicActiveIndex.value >= 0 && musicPlaying.value) {
    resetMusic();
  }
  musicActiveIndex.value = index;
  const music = musicList.value[index];

  if (!music._src) {
    const _music = await musicDB.get(music.sha);
    let blob;
    if (_music) {
      blob = _music.blob;
    } else {
      blob = await resolveMusicBlob(music);
      await musicDB.add({
        blob,
        name: music.path,
        sha: music.sha,
        url: music.url,
      });
    }
    const url = URL.createObjectURL(blob);
    music._src = url;
  }
  await nextTick();

  if (!audioEls[music.sha]) {
    audioEls[music.sha] = document.getElementById(music.sha);
  }
  clickContinue();
}

async function clickPlayByOrder(evt) {
  let index = 0;
  if (evt.type === 'ended' && index < musicList.value.length - 1) {
    index = musicActiveIndex.value + 1;
  }
  await clickPlay(index);
  audioEls[musicActive.value.sha].onended = clickPlayByOrder;
}

async function clickPlayByRandom() {
  const index = Math.floor(Math.random() * musicList.value.length);
  await clickPlay(index);
  audioEls[musicActive.value.sha].onended = clickPlayByRandom;
}

function clickContinue() {
  audioEls[musicActive.value.sha].play();
  musicPlaying.value = true;
  window.requestAnimationFrame(toAudioProgrssFrame);
}

function clickPause() {
  audioEls[musicActive.value.sha].pause();
  musicPlaying.value = false;
}

function clickNext() {
  audioEls[musicActive.value.sha].onended();
}

function resetMusic() {
  clickPause();
  audioEls[musicActive.value.sha].currentTime = 0;
}

async function resolveMusicBlob(music) {
  const res = await fetch(`${music.url}?access_token=${ACCESS_TOKEN}`);
  const resData = await res.json();
  const binaryData = atob(resData.content);
  // 创建一个 Uint8Array 来存储二进制数据
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }
  // 使用 Blob 构造函数创建 Blob 对象
  return new Blob([uint8Array], { type: 'audio/mp3' });
}

function toMusicName(music = musicActive.value) {
  return music.path.match(/(?<=-)[^.]+/)[0].trim();
}

function toMusicAuthor(music = musicActive.value) {
  return music.path.match(/.+?(?=-)/)[0].trim();
}

function toAudioProgrssFrame() {
  if (musicActiveIndex.value < 0 || !musicPlaying.value) return;
  const audioEl = audioEls[musicActive.value.sha];
  audioProgress.value = audioEl.currentTime / audioEl.duration;
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
  background: #69756566;
}

.music-item .svg-icon__music {
  font-size: 2em;
  margin: 0 0.5em;
  color: #999;
}

.music-item .svg-icon__music-rhythm {
  position: absolute;
  right: 0.5em;
  font-size: 2em;
  color: #697565;
}

.music-item .music-info {
  flex: auto;
  padding: 0.5em 0;
  border-bottom: 1px solid #333;
}

.music-info .music-name {
  margin-bottom: 0.5em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  height: 4em;
  background: #697565;
  display: flex;
  align-items: center;
  padding: 0 1em;
}

footer .svg-icon__music1 {
  flex: none;
  margin-right: 0.5em;
  font-size: 2em;
}

footer .music-info {
  flex: none;
  width: calc(100% - 9em);
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
