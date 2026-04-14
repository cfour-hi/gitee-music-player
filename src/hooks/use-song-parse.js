const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

export default function useSongParse() {
  async function resolveSongData(song) {
    const blob = await resolveSongBlob(song);
    song._tag = await resolveSongTag(blob);
    song._cover = toSongCover(song._tag);
    song._src = URL.createObjectURL(blob);
    return blob;
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
    const ext = song.path?.split('.').pop()?.toLowerCase();
    const mimeMap = { mp3: 'audio/mpeg', m4a: 'audio/mp4', flac: 'audio/flac', ogg: 'audio/ogg', wav: 'audio/wav' };
    return new Blob([uint8Array], { type: mimeMap[ext] || 'audio/mpeg' });
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
    const picture = songTag.tags.picture;
    if (!picture) return null;
    const blob = new Blob([new Uint8Array(picture.data)], { type: picture.format });
    return URL.createObjectURL(blob);
  }

  return {
    resolveSongData,
    resolveSongTag,
    toSongCover,
  };
}
