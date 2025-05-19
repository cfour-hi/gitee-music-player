import { nextTick, ref } from 'vue';

export default function useMusicSearch() {
  const searchRef = ref(null);
  const searching = ref(false);
  const searchContent = ref('');

  async function clickSearch() {
    searching.value = true;
    await nextTick();
    searchRef.value.focus();
  }

  function blurSearchInput() {
    searching.value = false;
    searchContent.value = '';
  }

  return {
    searchRef,
    searching,
    searchContent,
    clickSearch,
    blurSearchInput,
  };
}
