import { nextTick, ref, computed, watch } from 'vue';
import { pinyin } from 'pinyin-pro';
import { Converter } from 'opencc-js/t2cn';

// 繁体中文 → 简体中文（单字级；与 use-song-parse 同一套转换，保证输入侧与数据侧口径一致）
const toSimplified = Converter({ from: 't', to: 'cn' });

// 归一化：繁体→简体、小写、去掉所有标点/空白，只保留中英文与数字。
// 数据侧字段与输入关键词都走这一步，保证"七里香"能命中"七里香·Live"这类带符号的标题。
function normalizeText(s) {
  return toSimplified(String(s ?? ''))
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]/g, '');
}

// 中文→拼音全拼 + 首字母；连续英文/数字原样保留（nonZh: 'consecutive'）
function toPinyinForms(text) {
  const full = pinyin(text, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
    .join('')
    .toLowerCase();
  const initial = pinyin(text, {
    toneType: 'none',
    pattern: 'first',
    type: 'array',
    nonZh: 'consecutive',
  })
    .join('')
    .toLowerCase();
  return { full, initial };
}

// ---- 纯函数（模块级导出，便于单测）----

// 单首歌的搜索索引：原文 raw + 拼音 full/initial，预计算一次，输入时零重建
export function buildSongIndex(song) {
  const tags = song?._tag?.tags || {};
  const title = String(tags.title ?? '');
  const artist = String(tags.artist ?? '');
  const album = String(tags.album ?? '');
  const titleP = toPinyinForms(title);
  const artistP = toPinyinForms(artist);
  const albumP = toPinyinForms(album);
  return {
    song,
    titleRaw: normalizeText(title),
    artistRaw: normalizeText(artist),
    albumRaw: normalizeText(album),
    pathRaw: normalizeText(song?.path ?? ''),
    titleFull: titleP.full,
    titleInitial: titleP.initial,
    artistFull: artistP.full,
    artistInitial: artistP.initial,
    albumFull: albumP.full,
    albumInitial: albumP.initial,
  };
}

// 单个输入词：原文 clean + 拼音 full/initial；空词返回 null
export function buildKeyword(rawWord) {
  const clean = normalizeText(rawWord);
  if (!clean) return null;
  const { full, initial } = toPinyinForms(clean);
  return { clean, full, initial };
}

// 输入串按空白分词，逐词转拼音；多关键词为 AND 关系（如"周杰伦 七里香"）
export function buildKeywords(input) {
  return String(input ?? '')
    .split(/\s+/)
    .map(buildKeyword)
    .filter(Boolean);
}

// 一首歌是否命中全部关键词：
// 1) 原文子串命中 title/artist/album/path
// 2) 拼音全拼命中（输入拼音搜中文歌）
// 3) 拼音首字母命中（输入 qlx 搜"七里香"）
export function songMatches(idx, keywords) {
  return keywords.every((kw) => {
    const rawHit =
      idx.titleRaw.includes(kw.clean) ||
      idx.artistRaw.includes(kw.clean) ||
      idx.albumRaw.includes(kw.clean) ||
      idx.pathRaw.includes(kw.clean);
    if (rawHit) return true;
    return (
      idx.titleFull.includes(kw.full) ||
      idx.artistFull.includes(kw.full) ||
      idx.albumFull.includes(kw.full) ||
      idx.titleInitial.includes(kw.initial) ||
      idx.artistInitial.includes(kw.initial) ||
      idx.albumInitial.includes(kw.initial)
    );
  });
}

// ---- 高亮（供列表渲染）----

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// 只对"原文子串"命中做高亮（拼音/首字母命中无法定位原文位置，不高亮）。
// 先转义再切区间，避免 HTML 转义改变索引偏移。
export function highlightText(text, kws) {
  const s = String(text ?? '');
  const lower = s.toLowerCase();
  const ranges = [];
  for (const kw of kws || []) {
    if (!kw?.clean) continue;
    let from = 0;
    while (from < s.length) {
      const i = lower.indexOf(kw.clean, from);
      if (i < 0) break;
      ranges.push([i, i + kw.clean.length]);
      from = i + kw.clean.length;
    }
  }
  if (!ranges.length) return escapeHtml(s);

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0].slice()];
  for (let i = 1; i < ranges.length; i += 1) {
    const last = merged[merged.length - 1];
    const cur = ranges[i];
    if (cur[0] <= last[1]) {
      last[1] = Math.max(last[1], cur[1]);
    } else {
      merged.push(cur.slice());
    }
  }

  let out = '';
  let pos = 0;
  for (const [a, b] of merged) {
    out += escapeHtml(s.slice(pos, a));
    out += `<mark>${escapeHtml(s.slice(a, b))}</mark>`;
    pos = b;
  }
  out += escapeHtml(s.slice(pos));
  return out;
}

// ---- Hook ----

export default function useMusicSearch(songListSorted) {
  const searchRef = ref(null);
  const searching = ref(false);
  const searchContent = ref('');

  // 歌单变化时重建索引（一次性开销）；输入过程中直接查索引，不做任何重建
  const indexList = ref([]);
  watch(
    songListSorted,
    (list) => {
      indexList.value = (list || []).map(buildSongIndex);
    },
    { immediate: true },
  );

  // 当前生效关键词（分词 + 拼音化），匹配与高亮共用一份
  const keywords = computed(() => buildKeywords(searchContent.value));

  const filteredSongs = computed(() => {
    // 未处于搜索态时始终显示全量列表（搜索词保留但不生效）
    if (!searching.value) return songListSorted.value;
    const kws = keywords.value;
    if (!kws.length) return songListSorted.value;
    return indexList.value.filter((idx) => songMatches(idx, kws)).map((idx) => idx.song);
  });

  async function clickSearch() {
    searching.value = true;
    await nextTick();
    searchRef.value?.focus();
  }

  // 收起搜索：保留关键词，重新打开时自动恢复过滤
  function closeSearch() {
    searching.value = false;
  }

  // 彻底退出：清空关键词并收起
  function clearSearch() {
    searchContent.value = '';
    searching.value = false;
  }

  function blurSearchInput() {
    // 延迟收起，避免点击列表时搜索框先消失导致点击失效
    setTimeout(closeSearch, 200);
  }

  return {
    searchRef,
    searching,
    searchContent,
    filteredSongs,
    keywords,
    clickSearch,
    closeSearch,
    clearSearch,
    blurSearchInput,
  };
}
