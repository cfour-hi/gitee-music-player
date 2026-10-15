<template>
  <div class="now-playing" @click.self="$emit('close')">
    <!-- 模糊封面背景 -->
    <div class="bg-cover" :style="song?._cover ? { backgroundImage: `url(${song._cover})` } : {}"></div>
    <div class="bg-mask"></div>

    <!-- 顶部栏 -->
    <header class="np-header">
      <button class="icon-btn" @click="$emit('close')" title="收起">
        <DownOutlined />
      </button>
      <div class="np-artist ellipsis">{{ song?._tag?.tags?.artist || '' }}</div>
      <button class="icon-btn" @click="$emit('open-stats')" title="听歌统计">
        <BarChartOutlined />
      </button>
    </header>

    <!-- 封面 -->
    <div v-if="song?._cover" class="np-cover-wrap">
      <img :src="song._cover" class="np-cover" alt="" />
    </div>

    <!-- 歌名 -->
    <div class="np-title ellipsis">{{ song?._tag?.tags?.title || '' }}</div>

    <!-- 歌词区 -->
    <div class="np-lyrics" ref="lyricsRef">
      <template v-if="loading">
        <div class="lyric-line placeholder">歌词加载中…</div>
      </template>
      <template v-else-if="instrumental">
        <div class="lyric-line placeholder">纯音乐 · 无人声</div>
      </template>
      <template v-else-if="!lines.length">
        <div v-if="plainLyrics" class="lyric-plain">
          <div v-for="(line, i) in plainLines" :key="i" class="lyric-line plain">{{ line }}</div>
        </div>
        <div v-else class="lyric-line placeholder">
          {{ notFound ? '暂无歌词' : '' }}
        </div>
      </template>
      <template v-else>
        <div
          v-for="(line, i) in lines"
          :key="i"
          class="lyric-line"
          :class="{ active: i === currentIndex }"
          @click="$emit('seek', line.time)"
        >{{ line.text || '·' }}</div>
      </template>
    </div>

    <!-- 底部：进度 + 控制 -->
    <footer class="np-footer">
      <div class="np-progress" @click="onProgressClick">
        <div class="np-progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="np-time-row">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
      <div class="np-controls">
        <button class="ctl" @click="$emit('prev')" title="上一首">
          <StepBackwardFilled />
        </button>
        <button class="ctl ctl-main" @click="playing ? $emit('pause') : $emit('resume')" :title="playing ? '暂停' : '播放'">
          <PauseCircleFilled v-if="playing" />
          <PlayCircleFilled v-else />
        </button>
        <button class="ctl" @click="$emit('next')" title="下一首">
          <StepForwardFilled />
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { DownOutlined, PlayCircleFilled, PauseCircleFilled, StepBackwardFilled, StepForwardFilled, BarChartOutlined } from '@ant-design/icons-vue';

const props = defineProps({
  song: { type: Object, default: null },
  playing: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  lines: { type: Array, default: () => [] },
  plainLyrics: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  notFound: { type: Boolean, default: false },
  instrumental: { type: Boolean, default: false },
  currentIndex: { type: Number, default: -1 },
});

const emit = defineEmits(['close', 'resume', 'pause', 'prev', 'next', 'seek', 'open-stats']);

const lyricsRef = ref(null);

const progressPercent = computed(() => {
  if (!props.duration || !Number.isFinite(props.duration)) return 0;
  return Math.min(100, Math.max(0, (props.currentTime / props.duration) * 100));
});

const plainLines = computed(() => {
  if (!props.plainLyrics) return [];
  return props.plainLyrics.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
});

function formatTime(sec) {
  if (!sec || !Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function onProgressClick(evt) {
  if (!props.duration) return;
  const rect = evt.currentTarget.getBoundingClientRect();
  const ratio = (evt.clientX - rect.left) / rect.width;
  emit('seek', ratio * props.duration);
}

// 当前行变化时滚动歌词到中央（手动算 scrollTop，不用 scrollIntoView 避免穿透滚到 body）
watch(
  () => props.currentIndex,
  async (idx) => {
    if (idx < 0 || !lyricsRef.value) return;
    await nextTick();
    const el = lyricsRef.value.children[idx];
    if (!el) return;
    const target = el.offsetTop - lyricsRef.value.clientHeight / 2 + el.clientHeight / 2;
    lyricsRef.value.scrollTo({ top: target, behavior: 'smooth' });
  },
);

// 切歌时歌词区回到顶部
watch(() => props.song?.sha, async () => {
  await nextTick();
  lyricsRef.value?.scrollTo({ top: 0 });
});

// 全屏页打开期间锁定 body 滚动，避免背景歌曲列表跟着滚
onMounted(() => {
  document.body.style.overflow = 'hidden';
});

onBeforeUnmount(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.now-playing {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
  animation: slideUp 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.bg-cover {
  position: absolute;
  inset: -20px;
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.5) saturate(1.2);
  transform: scale(1.1);
  background-color: #2a2c2a;
}

.bg-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.45) 0%,
    rgba(0, 0, 0, 0.15) 35%,
    rgba(0, 0, 0, 0.75) 100%
  );
}

.np-header,
.np-cover-wrap,
.np-title,
.np-lyrics,
.np-footer {
  position: relative;
  z-index: 1;
}

.np-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 0.16rem) 0.24rem 0;
}

.icon-btn {
  width: 0.64rem;
  height: 0.64rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.4rem;
  cursor: pointer;
  border-radius: 50%;
}

.np-artist {
  flex: 1;
  text-align: center;
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.85);
}

.header-placeholder {
  width: 0.64rem;
}

.np-cover-wrap {
  display: flex;
  justify-content: center;
  margin: 0.32rem 0;
}

.np-cover {
  width: 60vw;
  max-width: 2.6rem;
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}

.np-title {
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: 600;
  padding: 0 0.4rem;
  margin-bottom: 0.16rem;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.np-lyrics {
  flex: 1;
  overflow-y: auto;
  padding: 0.2rem 0.48rem 0.4rem;
  text-align: center;
  scroll-behavior: smooth;
  -webkit-mask-image: linear-gradient(
    180deg,
    transparent 0,
    #000 12%,
    #000 85%,
    transparent 100%
  );
  mask-image: linear-gradient(
    180deg,
    transparent 0,
    #000 12%,
    #000 85%,
    transparent 100%
  );
}

.lyric-line {
  padding: 0.1rem 0;
  font-size: var(--font-size-base);
  color: rgba(255, 255, 255, 0.45);
  transition: all 0.25s ease;
  line-height: var(--line-height-relaxed);
  cursor: pointer;
}

.lyric-line.active {
  color: #fff;
  font-size: var(--font-size-md);
  font-weight: 600;
  transform: scale(1.06);
}

.lyric-line.placeholder {
  color: rgba(255, 255, 255, 0.4);
  cursor: default;
}

.lyric-line.plain {
  cursor: default;
}

.np-footer {
  flex: 0 0 auto;
  padding: 0.16rem 0.4rem calc(env(safe-area-inset-bottom, 0px) + 0.16rem);
}

.np-progress {
  position: relative;
  height: 0.08rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.04rem;
  cursor: pointer;
}

.np-progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 0.04rem;
}

.np-time-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-caption);
  color: rgba(255, 255, 255, 0.6);
  margin: 0.08rem 0 0.16rem;
}

.np-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.48rem;
}

.ctl {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.ctl:active {
  transform: scale(0.92);
}

.ctl .anticon {
  font-size: 0.64rem;
}

.ctl-main .anticon {
  font-size: 0.96rem;
}
</style>
