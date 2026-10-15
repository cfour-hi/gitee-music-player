<template>
  <footer v-if="song" class="player-bar" @click="emit('click')">
    <!-- 顶部进度条 -->
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ transform: `scaleX(${progress})` }"
      ></div>
    </div>

    <audio ref="audioRef"></audio>

    <!-- 封面 -->
    <img :src="song._cover || ''" class="song-cover" alt="" />

    <!-- 歌曲信息 -->
    <div class="song-info">
      <div class="song-name ellipsis">{{ song._tag.tags.title }}</div>
      <div class="song-author ellipsis">{{ song._tag.tags.artist }}</div>
    </div>

    <!-- 播放控制 -->
    <div class="player-controls">
      <button
        class="control-btn control-btn-prev"
        @click.stop="emit('prev')"
        title="上一首"
      >
        <StepBackwardFilled />
      </button>
      <button
        class="control-btn control-btn-main"
        @click.stop="playing ? emit('pause') : emit('resume')"
        :title="playing ? '暂停' : '播放'"
      >
        <span v-if="playing" class="pause-icon"><i></i><i></i></span>
        <span v-else class="play-icon"></span>
      </button>
      <button
        class="control-btn control-btn-next"
        @click.stop="emit('next')"
        title="下一首"
      >
        <StepForwardFilled />
      </button>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue';
import { StepBackwardFilled, StepForwardFilled } from '@ant-design/icons-vue';

defineProps({
  song: { type: Object, default: null },
  playing: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
});

const emit = defineEmits(['click', 'resume', 'pause', 'prev', 'next']);

const audioRef = ref(null);

defineExpose({ audioRef });
</script>

<style scoped>
.player-bar {
  flex: 0 0 1.4rem;
  display: flex;
  align-items: center;
  background: var(--color-bg-elevated);
  border-top: 1px solid var(--color-border-secondary);
  color: var(--color-text);
  position: relative;
  cursor: pointer;
  padding: 0 var(--spacing-md);
  gap: var(--spacing-md);
}

/* 进度条 */
.progress-track {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 0.04rem;
  background: var(--color-border-secondary);
}

.progress-fill {
  width: 100%;
  height: 100%;
  background: var(--color-primary);
  transform-origin: 0;
  transition: transform 0.1s linear;
}

/* 封面 */
.song-cover {
  flex-shrink: 0;
  width: 0.9rem;
  height: 0.9rem;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

/* 歌曲信息 */
.song-info {
  flex: auto;
  min-width: 0;
}

.song-name {
  color: var(--color-text);
  font-size: var(--font-size-base);
  font-weight: 500;
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-xs);
}

.song-author {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-tight);
}

/* 播放控制按钮 */
.player-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }
}

.control-btn-prev,
.control-btn-next {
  width: 0.56rem;
  height: 0.56rem;
  font-size: var(--font-size-md);
}

.control-btn-main {
  width: 0.72rem;
  height: 0.72rem;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--color-primary-hover);
    transform: scale(1.05);
  }
}

.pause-icon {
  display: flex;
  gap: 0.06rem;
}
.pause-icon i {
  width: 0.06rem;
  height: 0.2rem;
  background: #fff;
  border-radius: 1px;
}
.play-icon {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0.12rem 0 0.12rem 0.2rem;
  border-color: transparent transparent transparent #fff;
  margin-left: 0.04rem;
}
</style>
