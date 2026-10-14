import { Converter } from 'opencc-js/t2cn';

const OWNER = import.meta.env.VITE_OWNER;
const BRANCH = import.meta.env.VITE_BRANCH;
const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

// 繁体中文 → 简体中文（单字级；opencc-js/t2cn 子路径仅 109KB，
// 歌名/歌手场景下"軟體→软件"这类台湾惯用词几乎用不上，不背全量词库）
// 纯英文/数字是 no-op，不用额外判断
const toSimplified = Converter({ from: 't', to: 'cn' });

// ID3 tag 字段是否"可用"：非空，且排除常见占位符（Unknown / Track01 / Undefined 等）
function isUsableTag(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  if (/^(unknown|未知|undefined|null|track\s*\d*)$/i.test(s)) return false;
  return true;
}

// 去掉扩展名后的文件名（最后兜底显示）
function filenameStem(path) {
  return (path.split('/').pop() || '').replace(/\.[^.]+$/, '');
}

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

    // 如果格式不匹配，返回 null
    return null;
  }

  // 合并出最终展示 meta：手动修正 > ID3 tag > 文件名"歌手 - 歌名" > 文件名本身
  // - manual 值原样采用（用户自己输入的，不再自动转繁简）
  // - 自动来源（tag / 文件名）统一转成简体中文
  function resolveDisplayMeta(song) {
    const tags = song._tag?.tags || {};
    const parsed = parseSongInfo(song.path) || {};
    const manual = song.manualMeta || {};

    const autoTitle = isUsableTag(tags.title)
      ? tags.title.trim()
      : parsed.title || filenameStem(song.path) || '未知歌曲';
    const autoArtist = isUsableTag(tags.artist)
      ? tags.artist.trim()
      : parsed.artist || '未知艺术家';
    const autoAlbum = isUsableTag(tags.album) ? tags.album.trim() : '未知专辑';

    return {
      title: isUsableTag(manual.title) ? manual.title : toSimplified(autoTitle),
      artist: isUsableTag(manual.artist) ? manual.artist : toSimplified(autoArtist),
      album: isUsableTag(manual.album) ? manual.album : toSimplified(autoAlbum),
    };
  }

  // 把合并后的 meta 写回 _tag.tags，让列表 / MediaSession / 搜索统一读这一份
  function finalizeSongMeta(song) {
    if (!song._tag) song._tag = { tags: {} };
    if (!song._tag.tags) song._tag.tags = {};
    const meta = resolveDisplayMeta(song);
    song._tag.tags.title = meta.title;
    song._tag.tags.artist = meta.artist;
    song._tag.tags.album = meta.album;
  }

  async function resolveSongData(song) {
    const blob = await resolveSongBlob(song);
    song._tag = await resolveSongTag(blob);
    song._cover = toSongCover(song._tag);
    song._src = URL.createObjectURL(blob);

    // 统一走"手动修正 > tag > 文件名"的优先级合并，不再无条件用文件名覆盖 tag
    finalizeSongMeta(song);

    return blob;
  }

  // 通过 Gitee API v5 Raw 端点下载二进制音频文件
  // API 域名带 CORS 头；raw 端点即使公开仓库也需要 token 鉴权
  const MIME_MAP = { mp3: 'audio/mpeg', m4a: 'audio/mp4', flac: 'audio/flac', ogg: 'audio/ogg', wav: 'audio/wav' };
  async function resolveSongBlob(song) {
    const rawUrl = `https://gitee.com/api/v5/repos/${OWNER}/${song.repo}/raw/${encodeURI(song.path)}?ref=${BRANCH}&access_token=${ACCESS_TOKEN}`;
    // 30s 超时：避免请求挂起导致整个下载流程卡死
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(rawUrl, { signal: controller.signal });
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
    } finally {
      clearTimeout(timer);
    }
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
    resolveDisplayMeta,
    finalizeSongMeta,
  };
}
