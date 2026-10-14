<template>
  <div
    class="song-item"
    :class="{ active, cooled }"
    @click="emit('click', song.sha)"
    @touchstart="emit('touchstart', song)"
    @touchend="emit('touchend')"
    @touchmove="emit('touchmove')"
    @contextmenu.prevent="emit('contextmenu', song)"
  >
    <!-- 封面 -->
    <div class="song-cover-wrap">
      <img v-if="song._cover" :src="song._cover" class="song-cover" alt="" />
      <div v-else class="song-cover song-cover-placeholder">
        <CaretRightFilled />
      </div>
    </div>

    <!-- 歌曲信息 -->
    <div class="song-info">
      <div class="song-name ellipsis">
        <span v-html="hl(song._tag && song._tag.tags.title)"></span>
        <span v-if="cooled" class="cool-badge">
          冷却中 · {{ coolDownDays }} 天
        </span>
      </div>
      <div class="song-author ellipsis" v-html="hl(song._tag && song._tag.tags.artist)"></div>
    </div>
  </div>
</template>

<script setup>
import { CaretRightFilled } from '@ant-design/icons-vue';

defineProps({
  song: { type: Object, required: true },
  active: { type: Boolean, default: false },
  cooled: { type: Boolean, default: false },
  coolDownDays: { type: Number, default: 0 },
  hl: { type: Function, required: true },
});

const emit = defineEmits(['click', 'touchstart', 'touchend', 'touchmove', 'contextmenu']);
</script>

<style scoped>
.song-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-divider);
  border-left: 3px solid transparent;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:hover {
    background: var(--color-bg-hover);
  }

  &.active {
    background: var(--color-primary-bg);
    border-left-color: var(--color-primary);
  }

  &.cooled {
    opacity: 0.6;
  }

  &.cooled .song-name {
    color: var(--color-text-disabled);
  }
}

/* 封面容器 */
.song-cover-wrap {
  flex-shrink: 0;
  margin-right: var(--spacing-md);
}

.song-cover {
  width: 0.9rem;
  height: 0.9rem;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-bg-container);
}

.song-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 0.3rem;
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

/* 冷却标签 */
.cool-badge {
  display: inline-block;
  margin-left: var(--spacing-sm);
  padding: 0.02rem var(--spacing-xs);
  border-radius: var(--radius-sm);
  background: var(--color-warning);
  color: var(--color-text-inverse);
  font-size: var(--font-size-caption);
  font-weight: normal;
  vertical-align: middle;
}

/* 搜索命中高亮 */
:deep(mark) {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-sm);
  padding: 0 var(--spacing-xs);
}
</style>
