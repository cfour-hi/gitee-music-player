// 无内嵌封面时用 iTunes Search API 补封面
// - CORS 开放、免 key、返回 JSON
// - 命中后缓存 coverUrl 到 IndexedDB covers store
// - 永远不抛错，失败就静默返回 null

export default function useCover(musicDB) {
  async function fetchFromItunes(title, artist) {
    if (!title) return null;
    const term = encodeURIComponent(`${title} ${artist || ''}`.trim());
    const url = `https://itunes.apple.com/search?term=${term}&media=music&limit=1`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      const item = json.results?.[0];
      if (!item?.artworkUrl100) return null;
      // 100x100 → 600x600
      return item.artworkUrl100.replace('100x100', '600x600');
    } catch {
      return null;
    }
  }

  // 切歌时调用：若 song._cover 为空，尝试补封面并写回 song._cover
  async function tryFillCover(song) {
    if (!song || song._cover) return;
    const title = song._tag?.tags?.title;
    const artist = song._tag?.tags?.artist;
    if (!title) return;

    // 1. 先查缓存
    const cached = await musicDB.getCover(song.sha).catch(() => null);
    if (cached?.coverUrl) {
      song._cover = cached.coverUrl;
      return;
    }

    // 2. 网络拉
    const coverUrl = await fetchFromItunes(title, artist);
    if (coverUrl) {
      song._cover = coverUrl;
      musicDB.putCover({ sha: song.sha, coverUrl, fetchedAt: Date.now() }).catch(() => {});
    } else {
      // 明确没找到也写一条空记录，避免下次重复请求
      musicDB.putCover({ sha: song.sha, coverUrl: null, fetchedAt: Date.now() }).catch(() => {});
    }
  }

  return { tryFillCover };
}
