<template>
  <div>
    <div class="play-random" @click="clickPlayByRandom">随机播放</div>
  </div>
  <ul class="music-list">
    <li v-for="music in musicList" :key="music.sha">
      <svg-icon name="play" @click="clickPlay(music)"></svg-icon>
      {{ music.path }}
      <audio
        v-if="music._src"
        :id="music.sha"
        :src="music._src"
        controls
      ></audio>
    </li>
  </ul>
</template>

<script setup>
import useMusicDB from './hooks/use-musics-db';
import { nextTick, onMounted, ref } from 'vue';

const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;
const OWNER = import.meta.env.VITE_OWNER;
const REPO = import.meta.env.VITE_REPO;
const BRANCH = import.meta.env.VITE_BRANCH;

const musicList = ref([]);
const musicActive = ref(null);
const musicEls = {};

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

async function clickPlay(music) {
  if (musicActive.value) {
    musicEls[musicActive.value.sha].pause();
  }
  musicActive.value = music;

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

  if (!musicEls[music.sha]) {
    musicEls[music.sha] = document.getElementById(music.sha);
  }
  musicEls[music.sha].play();
}

async function clickPlayByRandom() {
  const index = Math.floor(Math.random() * musicList.value.length);
  await clickPlay(musicList.value[index]);
  musicEls[musicActive.value.sha].onended = clickPlayByRandom;
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
</script>

<style scoped>
.play-random {
  border: 1px solid #aaa;
  padding: 8px 16px;
}
</style>
