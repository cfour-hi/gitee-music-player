<template>
  <div v-if="song" class="action-overlay" @click="emit('close')">
    <div class="action-sheet" @click.stop>
      <!-- 歌曲信息 -->
      <div class="song-header">
        <img v-if="song._cover" :src="song._cover" class="cover" alt="" />
        <div v-else class="cover cover-placeholder">
          <CaretRightFilled />
        </div>
        <div class="song-meta">
          <div class="song-title ellipsis">{{ song._tag?.tags.title }}</div>
          <div class="song-artist ellipsis">{{ song._tag?.tags.artist }}</div>
        </div>
      </div>

      <!-- 浏览态：操作按钮 -->
      <template v-if="!editing">
        <div class="action-list">
          <button
            v-if="state.isCooled"
            class="action-item action-item-primary"
            @click="emit('unfreeze')"
          >
            <CaretRightFilled />
            立即解冻
          </button>
          <button
            v-else
            class="action-item action-item-warning"
            @click="emit('manualCool')"
          >
            <ClockCircleOutlined />
            暂别 4 周
          </button>
          <button class="action-item" @click="emit('edit')">
            <EditOutlined />
            编辑信息
          </button>
        </div>
      </template>

      <!-- 编辑态：表单 -->
      <template v-else>
        <div class="sheet-title">编辑歌曲信息</div>

        <div class="edit-form">
          <div class="form-item">
            <label>歌名</label>
            <input
              :value="form.title"
              type="text"
              placeholder="歌名"
              @input="updateField('title', $event.target.value)"
            />
          </div>
          <div class="form-item">
            <label>歌手</label>
            <input
              :value="form.artist"
              type="text"
              placeholder="歌手"
              @input="updateField('artist', $event.target.value)"
            />
          </div>
          <div class="form-item">
            <label>专辑</label>
            <input
              :value="form.album"
              type="text"
              placeholder="专辑"
              @input="updateField('album', $event.target.value)"
            />
          </div>
        </div>

        <div class="action-list">
          <button class="action-item action-item-primary" @click="emit('save')">
            保存修改
          </button>
          <button class="action-item" @click="emit('reset')">
            清除手动修正
          </button>
        </div>
      </template>

      <!-- 关闭按钮（独立） -->
      <button class="close-btn" @click="emit('close')">
        关闭
      </button>
    </div>
  </div>
</template>

<script setup>
import { CaretRightFilled, ClockCircleOutlined, EditOutlined } from '@ant-design/icons-vue';

const props = defineProps({
  song: { type: Object, default: null },
  editing: { type: Boolean, default: false },
  state: { type: Object, default: () => ({ isCooled: false }) },
  form: { type: Object, default: () => ({ title: '', artist: '', album: '' }) },
});

const emit = defineEmits([
  'close',
  'manualCool',
  'unfreeze',
  'edit',
  'save',
  'cancel',
  'reset',
  'update:form',
]);

function updateField(key, value) {
  emit('update:form', { ...props.form, [key]: value });
}
</script>

<style scoped>
.action-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-mask);
  z-index: var(--z-index-action-sheet);
  display: flex;
  align-items: flex-end;
  animation: fadeIn var(--motion-duration-normal) var(--motion-ease);
}

.action-sheet {
  width: 100%;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-2xl);
  box-shadow: var(--shadow-popup);
  animation: slideUp var(--motion-duration-normal) var(--motion-ease);
}

/* 歌曲头部 */
.song-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.cover {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--color-bg-container);
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 0.4rem;
}

.song-meta {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.song-artist {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.sheet-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

/* 操作列表 */
.action-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.action-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-bg-container);
  color: var(--color-text);
  font-size: var(--font-size-base);
  text-align: left;
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:hover {
    background: var(--color-bg-hover);
  }

  .anticon {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
  }
}

.action-item-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: 500;

  &:hover {
    background: var(--color-primary-hover);
  }

  .anticon {
    color: var(--color-text-inverse);
  }
}

.action-item-warning {
  background: var(--color-warning);
  color: var(--color-text-inverse);
  font-weight: 500;

  &:hover {
    background: color-mix(in srgb, var(--color-warning) 85%, white);
  }

  .anticon {
    color: var(--color-text-inverse);
  }
}

/* 编辑表单 */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);

  label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-base);
    color: var(--color-text);
    font-size: var(--font-size-base);
    outline: none;
    transition: border-color var(--motion-duration-fast) var(--motion-ease);

    &:focus {
      border-color: var(--color-primary);
    }
  }
}

/* 关闭按钮 */
.close-btn {
  width: 100%;
  padding: var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
