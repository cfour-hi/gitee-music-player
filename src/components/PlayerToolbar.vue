<template>
  <div class="toolbar">
    <!-- 左：刷新 + 播放模式 -->
    <div class="toolbar-left">
      <button class="icon-btn" @click="emit('refresh')" title="刷新">
        <ReloadOutlined :class="{ loading: songLoading }" />
      </button>

      <div v-if="hasSongs" class="play-btns">
        <button
          class="mode-btn"
          :class="{ active: playMode === 'order' }"
          @click="emit('playByOrder')"
          title="顺序播放"
        >
          <CaretRightFilled />
        </button>
        <button
          class="mode-btn"
          :class="{ active: playMode === 'random' }"
          @click="emit('playByRandom')"
          title="随机播放"
        >
          <SwapOutlined />
        </button>
      </div>
    </div>

    <!-- 右：发现 + 统计 + 搜索 -->
    <div class="toolbar-right">
      <button class="icon-btn" @click="emit('openDiscover')" title="发现热门">
        <CompassOutlined />
      </button>
      <button class="icon-btn" @click="emit('openStats')" title="听歌统计">
        <BarChartOutlined />
      </button>
      <button class="icon-btn" @click="emit('search')" title="搜索">
        <SearchOutlined />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ReloadOutlined, SearchOutlined, CaretRightFilled, SwapOutlined, CompassOutlined, BarChartOutlined } from '@ant-design/icons-vue';

defineProps({
  songLoading: { type: Boolean, default: false },
  hasSongs: { type: Boolean, default: false },
  playMode: { type: String, default: 'order' },
});

const emit = defineEmits(['refresh', 'playByOrder', 'playByRandom', 'search', 'openDiscover', 'openStats']);
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: auto;
  height: 100%;
  padding: 0 var(--spacing-md);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
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

@keyframes loading {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}
</style>
