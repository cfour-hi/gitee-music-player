const OWNER = import.meta.env.VITE_OWNER;
const BRANCH = import.meta.env.PROD ? import.meta.env.VITE_BRANCH : 'dev';
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

  // 通过 Gitee API v5 Raw 端点下载二进制音频文件
  // API 域名带 CORS 头；raw 端点即使公开仓库也需要 token 鉴权
  const MIME_MAP = { mp3: 'audio/mpeg', m4a: 'audio/mp4', flac: 'audio/flac', ogg: 'audio/ogg', wav: 'audio/wav' };
  async function resolveSongBlob(song) {
    const rawUrl = `https://gitee.com/api/v5/repos/${OWNER}/${song.repo}/raw/${encodeURI(song.path)}?ref=${BRANCH}&access_token=${ACCESS_TOKEN}`;
    const res = await fetch(rawUrl);
    if (!res.ok) {
      throw new Error(`下载失败 [${res.status}]: ${rawUrl}`);
    }
    const blob = await res.blob();
    // 确保 Blob 带有正确的 audio MIME type，否则 <audio> 可能拒绝播放
    const ext = song.path?.split('.').pop()?.toLowerCase();
    const correctType = MIME_MAP[ext];
    if (correctType && blob.type !== correctType) {
      return new Blob([blob], { type: correctType });
    }
    return blob;
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
