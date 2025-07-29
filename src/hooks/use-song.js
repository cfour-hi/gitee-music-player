import { computed, ref } from 'vue';

export default function useSong(musicDB) {
  const songLoading = ref(false);

  const songList = ref([]);
  const songListSorted = computed(() =>
    songList.value.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    ),
  );
  const songActiveIndex = ref(-1);
  const songActive = computed(
    () => songListSorted.value[songActiveIndex.value],
  );

  async function resolveSongsFromLocal() {
    const songs = await musicDB.get();
    for (const song of songs) {
      song._tag = await resolveSongTag(song.blob);
      song._cover = toSongCover(song._tag);
      song._src = URL.createObjectURL(song.blob);
    }
    songList.value = songs;
  }

  return {
    songLoading,
    songList,
    songListSorted,
    songActiveIndex,
    songActive,
    resolveSongsFromLocal,
  };
}
