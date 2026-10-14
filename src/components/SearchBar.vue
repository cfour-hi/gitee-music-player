<template>
  <div class="search-wrapper">
    <div class="search-input-wrap">
      <SearchOutlined class="search-prefix-icon" />
      <input
        ref="inputEl"
        :value="modelValue"
        type="text"
        class="input-search"
        placeholder="支持拼音、首字母、繁体，空格分隔多个关键词"
        @input="emit('update:modelValue', $event.target.value)"
        @blur="emit('blur')"
        @keydown.esc="emit('esc')"
      />
      <button v-if="modelValue" class="clear-btn" @click="emit('clear')">
        <CloseOutlined />
      </button>
    </div>

    <div v-if="modelValue && resultCount > 0" class="search-summary">
      共 {{ resultCount }} 首
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons-vue';

defineProps({
  modelValue: { type: String, default: '' },
  resultCount: { type: Number, default: 0 },
});

const emit = defineEmits(['update:modelValue', 'blur', 'esc', 'clear']);

const inputEl = ref(null);

defineExpose({
  focus: () => inputEl.value?.focus(),
});
</script>

<style scoped>
.search-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  padding: var(--spacing-xs) var(--spacing-md);
  justify-content: center;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  height: var(--btn-height-sm);
  background: var(--color-bg-container);
  border-radius: var(--radius-md);
  padding: 0 var(--spacing-sm);
  gap: var(--spacing-xs);
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:focus-within {
    background: var(--color-bg-elevated);
    box-shadow: 0 0 0 2px var(--color-primary-bg);
  }
}

.search-prefix-icon {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.input-search {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  outline: none;

  &::placeholder {
    color: var(--color-text-quaternary);
  }
}

.clear-btn {
  width: 0.4rem;
  height: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-round);
  background: var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.2rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--motion-duration-fast) var(--motion-ease);

  &:hover {
    background: var(--color-text-quaternary);
    color: var(--color-text);
  }
}

.search-summary {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding: var(--spacing-xs) var(--spacing-lg);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption);
  border-bottom: 1px solid var(--color-border-secondary);
  background: var(--color-bg-base);
}
</style>
