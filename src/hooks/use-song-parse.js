const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

export default function useSongParse() {
  // 从文件名解析歌手和歌曲名（格式：歌手名 - 歌曲名.扩展名）
  // 如果格式匹配，返回解析结果；否则返回 null
  function parseSongInfo(path) {
    // 获取文件名（去除路径）
    const filename = path.split('/').pop();
    // 去除扩展名
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
    // 按 " - " 分割
    const parts = nameWithoutExt.split(' - ');
    
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim(), // 支持歌曲名中包含 " - "
      };
    }
    
    // 如果格式不匹配，返回 null，表示回退到使用 tags
    return null;
  }

  async function resolveSongData(song) {
    const blob = await resolveSongBlob(song);
    song._tag = await resolveSongTag(blob);
    song._cover = toSongCover(song._tag);
    song._src = URL.createObjectURL(blob);
    
    // 从文件名解析歌曲信息，如果成功则覆盖标签信息
    const parsedInfo = parseSongInfo(song.path);
    if (parsedInfo) {
      song._tag.tags.title = parsedInfo.title;
      song._tag.tags.artist = parsedInfo.artist;
    }
    
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
    parseSongInfo,
  };
}
