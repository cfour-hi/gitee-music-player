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
      <div class="header-placeholder"></div>
    </header>

    <!-- 封面 -->
    <div v-if="song?._cover" class="np-cover-wrap">
      <img :src="song._cover" class="np-cover" alt="" />
    </div>

    <!-- 歌名 -->
    <div class="np-title ellipsis">{{ song?._tag?.tags?.title || '' }}</div>

    <!-- 歌词区 -->
    <div class="np-lyrics" ref="lyricsRef" @contextmenu.prevent="offsetMenuOpen = true">
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

    <!-- 歌词校准弹出 -->
    <div v-if="offsetMenuOpen" class="offset-menu" @click.self="offsetMenuOpen = false">
      <div class="offset-title">歌词校准（当前 {{ offset > 0 ? '+' : '' }}{{ offset }}s）</div>
      <div class="offset-row">
        <button @click="$emit('adjust-offset', -0.5)">歌词提前 0.5s</button>
        <button @click="$emit('adjust-offset', 0.5)">歌词延后 0.5s</button>
      </div>
      <button v-if="offset !== 0" class="offset-reset" @click="resetOffset">重置</button>
    </div>

    <!-- 底部：进度 + 控制 -->
    <footer class="np-footer">
      <div
        class="np-progress"
        @mousedown="onStartDrag"
        @touchstart.prevent="onStartDrag"
      >
        <div class="np-progress-fill" :style="{ width: (dragging ? dragPercent : progressPercent) + '%' }"></div>
        <div class="np-thumb" :style="{ left: (dragging ? dragPercent : progressPercent) + '%' }"></div>
      </div>
      <div class="np-time-row">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
      <div class="np-controls">
        <button class="ctl" @click="queueOpen = !queueOpen" title="播放队列">
          <UnorderedListOutlined />
        </button>
        <button class="ctl" @click="cycleSleep" title="睡眠定时">
          <ClockCircleOutlined :class="{ active: sleepMinutes > 0 }" />
          <span v-if="sleepMinutes > 0" class="sleep-badge">{{ sleepRemain || sleepMinutes + 'm' }}</span>
        </button>
        <button class="ctl" @click="$emit('prev')" title="上一首">
          <StepBackwardFilled />
        </button>
        <button class="ctl ctl-main" @click="playing ? $emit('pause') : $emit('resume')" :title="playing ? '暂停' : '播放'">
          <span v-if="playing" class="pause-icon"><i></i><i></i></span>
          <span v-else class="play-icon"></span>
        </button>
        <button class="ctl" @click="$emit('next')" title="下一首">
          <StepForwardFilled />
        </button>
      </div>

      <!-- 播放队列 -->
      <div v-if="queueOpen" class="queue-panel" @click.self="queueOpen = false">
        <div class="queue-title">接下来播放</div>
        <div v-if="queue.length === 0" class="queue-empty">
          随机模式下下一首由算法决定，点"下一首"试试
        </div>
        <div v-else class="queue-list">
          <div v-for="(s, i) in queue" :key="i" class="queue-item">
            <span class="queue-no">{{ i + 1 }}</span>
            <span class="queue-title-item">{{ s._tag?.tags?.title || s.path }}</span>
            <span class="queue-artist">{{ s._tag?.tags?.artist || '' }}</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { DownOutlined, StepBackwardFilled, StepForwardFilled, ClockCircleOutlined, UnorderedListOutlined } from '@ant-design/icons-vue';

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
  offset: { type: Number, default: 0 },
  queue: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'resume', 'pause', 'prev', 'next', 'seek', 'adjust-offset']);

const lyricsRef = ref(null);
const offsetMenuOpen = ref(false);
const queueOpen = ref(false);

function resetOffset() {
  const delta = -props.offset;
  offsetMenuOpen.value = false;
  emit('adjust-offset', delta);
}

// ---- 睡眠定时 ----
const sleepMinutes = ref(0);
const sleepRemain = ref('');
let sleepTimer = null;
let sleepInterval = null;

// 点闹钟按钮循环：关 → 15 → 30 → 60 → 关
const SLEEP_STEPS = [0, 15, 30, 60];
function cycleSleep() {
  const idx = SLEEP_STEPS.indexOf(sleepMinutes.value);
  const next = SLEEP_STEPS[(idx + 1) % SLEEP_STEPS.length];
  setSleep(next);
}

function setSleep(min) {
  sleepMinutes.value = min;
  sleepMenuOpen.value = false;
  if (sleepTimer) clearTimeout(sleepTimer);
  if (sleepInterval) clearInterval(sleepInterval);
  if (min <= 0) {
    sleepRemain.value = '';
    return;
  }
  const end = Date.now() + min * 60 * 1000;
  sleepTimer = setTimeout(() => {
    emit('pause');
    sleepMinutes.value = 0;
    sleepRemain.value = '';
  }, min * 60 * 1000);
  sleepInterval = setInterval(() => {
    const left = Math.max(0, Math.round((end - Date.now()) / 1000));
    const m = Math.floor(left / 60);
    const s = left % 60;
    sleepRemain.value = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  }, 1000);
}

onBeforeUnmount(() => {
  if (sleepTimer) clearTimeout(sleepTimer);
  if (sleepInterval) clearInterval(sleepInterval);
});

const progressPercent = computed(() => {
  if (!props.duration || !Number.isFinite(props.duration)) return 0;
  return Math.min(100, Math.max(0, (props.currentTime / props.duration) * 100));
});

// 进度条拖拽
const dragging = ref(false);
const dragPercent = ref(0);

function ratioFromEvent(e) {
  const bar = e.currentTarget.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return Math.min(1, Math.max(0, (clientX - bar.left) / bar.width));
}

function onStartDrag(e) {
  if (!props.duration) return;
  dragging.value = true;
  dragPercent.value = ratioFromEvent(e) * 100;
  const move = (ev) => {
    if (!dragging.value) return;
    dragPercent.value = ratioFromEvent(ev) * 100;
  };
  const up = (ev) => {
    dragging.value = false;
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    window.removeEventListener('touchmove', move);
    window.removeEventListener('touchend', up);
    const clientX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
    const bar = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bar.left) / bar.width));
    emit('seek', ratio * props.duration);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  window.addEventListener('touchmove', move);
  window.addEventListener('touchend', up);
}

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
  position: relative;
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

.np-thumb {
  position: absolute;
  top: 50%;
  width: 0.12rem;
  height: 0.12rem;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px rgba(0,0,0,0.3);
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
  font-size: 0.72rem;
}

.ctl-main {
  background: var(--color-primary);
  width: 1.1rem;
  height: 1.1rem;
  min-width: 1.1rem;
  flex-shrink: 0;
  padding: 0;
}
.ctl-main .anticon {
  color: #fff;
}

/* 纯 CSS 暂停/播放图标，避免图标库自带圆框 */
.pause-icon {
  display: flex;
  gap: 0.08rem;
}
.pause-icon i {
  width: 0.08rem;
  height: 0.28rem;
  background: #fff;
  border-radius: 1px;
}
.play-icon {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0.16rem 0 0.16rem 0.28rem;
  border-color: transparent transparent transparent #fff;
  margin-left: 0.06rem;
}

.ctl {
  position: relative;
}
.ctl .active {
  color: var(--color-primary);
}
.sleep-badge {
  position: absolute;
  top: -2px;
  right: -6px;
  min-width: 0.28rem;
  text-align: center;
  font-size: 0.18rem;
  background: #ff4757;
  color: #fff;
  border-radius: 0.14rem;
  padding: 0 0.04rem;
  line-height: 1.4;
}

.offset-menu {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(30, 32, 30, 0.97);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  z-index: 10;
  text-align: center;
  .offset-title {
    color: #fff;
    font-size: var(--font-size-base);
    margin-bottom: var(--spacing-sm);
  }
  .offset-row {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }
  button {
    background: var(--color-primary-bg);
    border: 1px solid var(--color-primary);
    color: #fff;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  .offset-reset {
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
  }
}

.queue-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(30, 32, 30, 0.98);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--spacing-md) var(--spacing-lg) calc(var(--spacing-xl) + 0.5rem);
  max-height: 60vh;
  overflow-y: auto;
  z-index: 10;
  .queue-title {
    color: #fff;
    font-size: var(--font-size-base);
    margin-bottom: var(--spacing-sm);
  }
  .queue-empty {
    color: rgba(255,255,255,0.5);
    font-size: var(--font-size-sm);
    padding: var(--spacing-md) 0;
  }
  .queue-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) 0;
    color: #fff;
    font-size: var(--font-size-base);
    .queue-no {
      color: rgba(255,255,255,0.4);
      width: 1rem;
      flex-shrink: 0;
    }
    .queue-title-item {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .queue-artist {
      color: rgba(255,255,255,0.5);
      font-size: var(--font-size-sm);
    }
  }
}
</style>
