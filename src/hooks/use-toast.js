import { reactive } from 'vue';

// 全局 toast 状态
const state = reactive({
  toasts: [],
});

let nextId = 1;

/**
 * 全局轻提示（参考 antd message）
 * @param {string} content - 提示内容
 * @param {object} options - { type: 'info'|'success'|'warning'|'error', duration: ms }
 */
function toast(content, options = {}) {
  const id = nextId++;
  const type = options.type || 'info';
  const duration = options.duration || 2000;

  state.toasts.push({ id, content, type });

  if (duration > 0) {
    setTimeout(() => {
      remove(id);
    }, duration);
  }

  return id;
}

function remove(id) {
  const idx = state.toasts.findIndex((t) => t.id === id);
  if (idx >= 0) state.toasts.splice(idx, 1);
}

// 便捷方法
toast.success = (content, options) => toast(content, { ...options, type: 'success' });
toast.warning = (content, options) => toast(content, { ...options, type: 'warning' });
toast.error = (content, options) => toast(content, { ...options, type: 'error' });
toast.info = (content, options) => toast(content, { ...options, type: 'info' });

export function useToast() {
  return {
    toasts: state.toasts,
    toast,
    remove,
  };
}
