// 听歌统计：纯聚合 play_events，不引入新采集
// events 结构：{ sha, at: timestamp, completed: bool, playedRatio: 0~1 }
// songList：本地歌库（用于 sha → title/artist join）

// ---- 纯函数（可单测）----

// 按 sha 聚合 completed=true 的次数，取 top N
export function topSongs(events, songList, n = 10) {
  const count = new Map();
  for (const ev of events) {
    if (!ev.completed) continue;
    count.set(ev.sha, (count.get(ev.sha) || 0) + 1);
  }
  const bySha = new Map(songList.map((s) => [s.sha, s]));
  return [...count.entries()]
    .map(([sha, plays]) => {
      const song = bySha.get(sha);
      const tags = song?._tag?.tags || {};
      return {
        sha,
        plays,
        title: tags.title || song?.path || sha.slice(0, 8),
        artist: tags.artist || '未知',
      };
    })
    .sort((a, b) => b.plays - a.plays)
    .slice(0, n);
}

// 按 artist 聚合（基于 completed 事件）
export function topArtists(events, songList, n = 10) {
  const bySha = new Map(songList.map((s) => [s.sha, s]));
  const count = new Map();
  for (const ev of events) {
    if (!ev.completed) continue;
    const tags = bySha.get(ev.sha)?._tag?.tags || {};
    const artist = (tags.artist || '未知').trim();
    if (!artist) continue;
    count.set(artist, (count.get(artist) || 0) + 1);
  }
  return [...count.entries()]
    .map(([artist, plays]) => ({ artist, plays }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, n);
}

// 24 小时分布：所有 events（含跳过）按 getHours() 分桶
export function hourDistribution(events) {
  const buckets = new Array(24).fill(0);
  for (const ev of events) {
    buckets[new Date(ev.at).getHours()]++;
  }
  return buckets;
}

// 最近 N 天每天听歌次数（含跳过）
export function recentDays(events, days = 7, now = Date.now()) {
  const dayMs = 24 * 3600 * 1000;
  const buckets = new Array(days).fill(0);
  const labels = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * dayMs);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  for (const ev of events) {
    const idx = Math.floor((today.getTime() - new Date(ev.at).setHours(0, 0, 0, 0)) / dayMs);
    if (idx >= 0 && idx < days) buckets[days - 1 - idx]++;
  }
  return buckets.map((count, i) => ({ label: labels[i], count }));
}

// 总览数字
export function overview(events) {
  const total = events.length;
  const completed = events.filter((e) => e.completed).length;
  const skipped = total - completed;
  return {
    total,
    completed,
    skipped,
    skipRate: total ? Math.round((skipped / total) * 100) : 0,
  };
}

// ---- Hook ----

export default function useStats(musicDB, songListRef) {
  async function load() {
    const events = await musicDB.getAllEvents();
    const songs = songListRef.value || [];
    return {
      overview: overview(events),
      topSongs: topSongs(events, songs),
      topArtists: topArtists(events, songs),
      hours: hourDistribution(events),
      week: recentDays(events, 7),
    };
  }
  return { load };
}
