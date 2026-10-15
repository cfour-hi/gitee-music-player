<template>
  <div class="toolbar">
    <!-- 图标按钮组 -->
    <button class="icon-btn" @click="emit('refresh')" title="刷新">
      <ReloadOutlined :class="{ loading: songLoading }" />
    </button>

    <!-- 播放模式按钮 -->
    <div v-if="hasSongs" class="play-btns">
      <button
        class="mode-btn"
        :class="{ active: playMode === 'order' }"
        @click="emit('playByOrder')"
      >
        <CaretRightFilled />
        顺序
      </button>
      <button
        class="mode-btn"
        :class="{ active: playMode === 'random' }"
        @click="emit('playByRandom')"
      >
        <SwapOutlined />
        随机
      </button>
    </div>

    <!-- 情绪分段控制器 -->
    <div v-if="hasSongs" class="mood-segment">
      <button
        v-for="m in moods"
        :key="m.key"
        class="mood-btn"
        :class="{ active: mood === m.key }"
        @click="emit('setMood', m.key)"
      >{{ m.label }}</button>
    </div>

    <!-- 发现（热门榜单） -->
    <button class="icon-btn" @click="emit('openDiscover')" title="发现热门">
      <CompassOutlined />
    </button>

    <!-- 统计 -->
    <button class="icon-btn" @click="emit('openStats')" title="听歌统计">
      <BarChartOutlined />
    </button>

    <!-- 搜索图标按钮 -->
    <button class="icon-btn" @click="emit('search')" title="搜索">
      <SearchOutlined />
    </button>
  </div>
</template>

<script setup>
import { ReloadOutlined, SearchOutlined, CaretRightFilled, SwapOutlined, CompassOutlined, BarChartOutlined } from '@ant-design/icons-vue';

defineProps({
  songLoading: { type: Boolean, default: false },
  hasSongs: { type: Boolean, default: false },
  moods: { type: Array, default: () => [] },
  mood: { type: String, default: 'neutral' },
  playMode: { type: String, default: 'order' },
});

const emit = defineEmits(['refresh', 'playByOrder', 'playByRandom', 'setMood', 'search', 'openDiscover', 'openStats']);
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  flex: auto;
  height: 100%;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md);
}

/* 图标按钮（统一大小和样式） */
.icon-btn {
  width: var(--icon-btn-size);
  height: var(--icon-btn-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  &:active {
    background: var(--color-bg-container);
  }
}

.icon-btn .loading {
  animation: 1s linear infinite loading;
}

/* 播放模式按钮 */
.play-btns {
  display: inline-flex;
  gap: var(--spacing-xs);
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  height: var(--btn-height-sm);
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  background: transparent;
  font-size: var(--font-size-sm);
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  &.active {
    background: var(--color-primary-bg);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .anticon {
    font-size: var(--font-size-sm);
  }
}

/* 情绪分段控制器 */
.mood-segment {
  display: inline-flex;
  margin-left: auto;
  background: var(--color-bg-container);
  border-radius: var(--radius-md);
  padding: 0.04rem;
  gap: 0;
}

.mood-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: transparent;
  font-size: var(--font-size-base);
  cursor: pointer;
  line-height: 1;
  border-radius: var(--radius-sm);
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &.active {
    background: var(--color-primary);
    box-shadow: var(--shadow-card);
  }
}

@keyframes loading {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}
</style>
