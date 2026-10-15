// 歌词：LRCLIB 搜索 + LRC 解析 + IndexedDB 缓存
// - LRCLIB (lrclib.net)：免 key、CORS 开放，免费歌词数据库
// - 命中后把 { lines, plain, instrumental } 按 sha 持久化到 IndexedDB，下次零网络
// - "确定没有歌词"也写缓存（lines=[]），避免切回这首歌又请求一次
// - 网络错误不写缓存，留给下次重试

import { ref } from 'vue';
import { Converter } from 'opencc-js/t2cn';

// 繁体 → 简体（和 use-song-parse 同一套转换，台湾上传的歌词常见繁体）
const toSimplified = Converter({ from: 't', to: 'cn' });

// LRC 时间戳：[mm:ss.xx] / [mm:ss.xxx] / [mm:ss]
const TIME_RE = /\[(\d+):(\d+(?:\.\d+)?)\]/g;

// 解析 LRC 文本为 [{ time: 秒, text: 字符串 }]，按时间升序
// 兼容一行多个时间标签：[00:12.00][00:17.00]歌词
function parseLRC(lrcText) {
  if (!lrcText) return [];
  const out = [];
  for (const raw of lrcText.split(/\r?\n/)) {
    const times = [];
    let m;
    TIME_RE.lastIndex = 0;
    while ((m = TIME_RE.exec(raw))) {
      times.push(parseInt(m[1], 10) * 60 + parseFloat(m[2]));
    }
    if (!times.length) continue; // 元信息行 [ti:] / [ar:] 等
    const text = toSimplified(raw.replace(TIME_RE, '').trim());
    for (const t of times) out.push({ time: t, text });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

// 调 LRCLIB /api/search，优先取有 syncedLyrics 的结果
async function fetchFromLRCLIB(title, artist) {
  const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`LRCLIB HTTP ${res.status}`);
    const arr = await res.json();
    if (!Array.isArray(arr) || !arr.length) return null;

    const synced = arr.find((r) => r.syncedLyrics);
    if (synced) {
      return {
        lines: parseLRC(synced.syncedLyrics),
        plain: synced.plainLyrics ? toSimplified(synced.plainLyrics) : '',
      };
    }
    if (arr.some((r) => r.instrumental)) {
      return { lines: [], plain: '', instrumental: true };
    }
    const plain = arr.find((r) => r.plainLyrics);
    if (plain) return { lines: [], plain: toSimplified(plain.plainLyrics) };
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default function useLyrics(musicDB) {
  const lines = ref([]);            // [{time, text}]，同步歌词
  const plainLyrics = ref('');      // 纯文本歌词（无时间轴时兜底展示）
  const loading = ref(false);
  const notFound = ref(false);       // 明确搜过但没结果
  const instrumental = ref(false);   // 纯音乐
  const currentIndex = ref(-1);     // 当前高亮行下标

  let requestSeq = 0; // 切歌时使上一次未完成请求作废

  async function load(song) {
    const seq = ++requestSeq;
    lines.value = [];
    plainLyrics.value = '';
    currentIndex.value = -1;
    notFound.value = false;
    instrumental.value = false;
    if (!song) return;

    loading.value = true;
    try {
      // 1. 本地缓存
      const cached = await musicDB.getLyrics(song.sha);
      if (seq !== requestSeq) return;
      if (cached) {
        // 旧缓存可能是繁体（转换功能上线前拉的），读取时统一过一遍；新缓存已经是简体，双转无害
        lines.value = (cached.lines || []).map((l) => ({ ...l, text: toSimplified(l.text) }));
        plainLyrics.value = cached.plain ? toSimplified(cached.plain) : '';
        instrumental.value = !!cached.instrumental;
        loading.value = false;
        return;
      }

      const title = song._tag?.tags?.title;
      const artist = song._tag?.tags?.artist;
      if (!title || !artist) {
        notFound.value = true;
        return;
      }

      // 2. 网络拉取
      const result = await fetchFromLRCLIB(title, artist);
      if (seq !== requestSeq) return;

      // 无论命中与否，"这次请求有结果"都写缓存（包括空结果），避免下次重复请求
      await musicDB.putLyrics({
        sha: song.sha,
        lines: result?.lines || [],
        plain: result?.plain || '',
        instrumental: !!result?.instrumental,
        fetchedAt: Date.now(),
      }).catch(() => {});

      if (!result) {
        notFound.value = true;
      } else {
        lines.value = result.lines || [];
        plainLyrics.value = result.plain || '';
        instrumental.value = !!result.instrumental;
        if (!lines.value.length && !plainLyrics.value && !instrumental.value) {
          notFound.value = true;
        }
      }
    } catch (err) {
      // 网络错误：不写缓存，下次再试；UI 显示"加载失败/暂无歌词"
      console.warn('歌词加载失败:', err?.message || err);
      notFound.value = true;
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  }

  // 根据 audio.currentTime（秒）二分更新当前行号
  function sync(currentTime) {
    const arr = lines.value;
    if (!arr.length) return;
    let lo = 0, hi = arr.length - 1, idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].time <= currentTime) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (idx !== currentIndex.value) currentIndex.value = idx;
  }

  return {
    lines, plainLyrics, loading, notFound, instrumental, currentIndex,
    load, sync,
  };
}
