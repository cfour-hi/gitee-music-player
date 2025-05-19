export default function useSongParse() {
  async function resolveSongData(song) {
    const blob = await resolveSongBlob(song);
    await musicDB.add({
      blob,
      path: song.path,
      sha: song.sha,
      url: song.url,
    });
    song._tag = await resolveSongTag(blob);
    song._cover = toSongCover(song._tag);
    song._src = URL.createObjectURL(blob);
  }

  async function resolveSongBlob(song) {
    const res = await fetch(`${song.url}?access_token=${ACCESS_TOKEN}`);
    const resData = await res.json();
    const binaryData = atob(resData.content);
    const arrayBuffer = new ArrayBuffer(binaryData.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < binaryData.length; i++) {
      uint8Array[i] = binaryData.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: 'audio/mp3' });
  }

  function resolveSongTag(blob) {
    return new Promise((resolve, reject) => {
      window.jsmediatags.read(blob, {
        onSuccess: resolve,
        onError: reject,
      });
    });
  }

  function toSongCover(songTag) {
    const { data, format } = songTag.tags.picture;
    const blob = new Blob([new Uint8Array(data)], { type: format });
    return URL.createObjectURL(blob);
  }

  return {
    resolveSongData,
    resolveSongTag,
    toSongCover,
  };
}
