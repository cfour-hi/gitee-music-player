<template>
  <Teleport to="body">
    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-item"
          :class="`toast-${t.type}`"
        >
          <CheckCircleFilled v-if="t.type === 'success'" class="toast-icon" />
          <ExclamationCircleFilled v-else-if="t.type === 'warning'" class="toast-icon" />
          <CloseCircleFilled v-else-if="t.type === 'error'" class="toast-icon" />
          <InfoCircleFilled v-else class="toast-icon" />
          <span>{{ t.content }}</span>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<script setup>
import { CheckCircleFilled, ExclamationCircleFilled, CloseCircleFilled, InfoCircleFilled } from '@ant-design/icons-vue';
import { useToast } from '../hooks/use-toast';

const { toasts } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-index-toast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-lg);
  background: var(--color-bg-elevated);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  box-shadow: var(--shadow-card);
  max-width: 80vw;
  white-space: nowrap;
  pointer-events: auto;
}

.toast-icon {
  font-size: var(--font-size-md);
  flex-shrink: 0;
}

.toast-success .toast-icon { color: var(--color-success); }
.toast-warning .toast-icon { color: var(--color-warning); }
.toast-error .toast-icon { color: var(--color-danger); }
.toast-info .toast-icon { color: var(--color-primary); }

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all var(--motion-duration-normal) var(--motion-ease);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
