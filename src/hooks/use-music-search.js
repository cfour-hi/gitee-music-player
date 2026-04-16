import { nextTick, ref, computed } from 'vue';

export default function useMusicSearch(songListSorted) {
  const searchRef = ref(null);
  const searching = ref(false);
  const searchContent = ref('');

  const filteredSongs = computed(() => {
    const kw = searchContent.value.trim().toLowerCase();
    if (!kw) return songListSorted.value;

    return songListSorted.value.filter((song) => {
      const songPath = song.path.toLowerCase();
      const title = (song._tag?.tags.title ?? '').toLowerCase();
      const artist = (song._tag?.tags.artist ?? '').toLowerCase();
      const album = (song._tag?.tags.album ?? '').toLowerCase();
      return title.includes(kw) || songPath.includes(kw) || artist.includes(kw) || album.includes(kw);
    });
  });

  async function clickSearch() {
    searching.value = true;
    await nextTick();
    searchRef.value.focus();
  }

  function closeSearch() {
    searching.value = false;
    searchContent.value = '';
  }

  function blurSearchInput() {
    // 延迟关闭，避免点击列表时搜索框先消失导致点击失效
    setTimeout(closeSearch, 200);
  }

  return {
    searchRef,
    searching,
    searchContent,
    filteredSongs,
    clickSearch,
    closeSearch,
    blurSearchInput,
  };
}
