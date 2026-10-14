// 发现面板：加载 CI 预生成的榜单 JSON，管理「待下载清单」
// 数据来自 ../data/toplist.json（由 scripts/fetch-toplist.mjs 在 CI 里生成）
// 收藏清单持久化到 localStorage，结构简单够用
//
// 方案 C：和本地库联动——榜单项若已在 Gitee 仓库里传过同名同歌手的歌，
// 直接匹配到本地 song 对象，点击即可播本地 blob，不碰外部音频流。

import { ref, computed, onMounted, unref } from 'vue'
import { normalizeText } from './use-music-search'

const STORAGE_KEY = 'discover-wishlist-v1'

// 动态 import：JSON 在 .gitignore 里，本地首次 clone 后若未跑脚本则文件不存在，
// Vite 会在构建时把它打到 bundle；dev 模式下文件缺失时优雅降级为空面板。
async function loadToplist() {
  try {
    const mod = await import('../data/toplist.json')
    return mod.default || mod
  } catch (err) {
    console.warn('榜单数据未找到，请先运行 node scripts/fetch-toplist.mjs', err)
    return null
  }
}

function loadWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// 从 "歌手 - 歌名.mp3" 文件名解析中文 artist/title（和 use-song-parse 同口径）
function parseFilename(path) {
  const filename = String(path ?? '').split('/').pop().replace(/\.[^.]+$/, '')
  const parts = filename.split(' - ')
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() }
  }
  return null
}

// 本地歌可能的 title 候选：手动修正 > ID3 tag（可能是拼音）> 文件名解析（中文）
// 匹配时任一候选命中即可，解决"ID3 是拼音但文件名是中文"的常见情况
function titleCandidates(song) {
  const cands = []
  if (song.manualMeta?.title) cands.push(song.manualMeta.title)
  if (song._tag?.tags?.title) cands.push(song._tag.tags.title)
  const parsed = parseFilename(song.path)
  if (parsed?.title) cands.push(parsed.title)
  return cands.map(normalizeText).filter(Boolean)
}

function artistCandidates(song) {
  const cands = []
  if (song.manualMeta?.artist) cands.push(song.manualMeta.artist)
  if (song._tag?.tags?.artist) cands.push(song._tag.tags.artist)
  const parsed = parseFilename(song.path)
  if (parsed?.artist) cands.push(parsed.artist)
  // 合并成一个大集合（拆分多人分隔符）
  const set = new Set()
  for (const raw of cands) {
    for (const a of String(raw).split(/[\/、,，·&]/)) {
      const n = normalizeText(a)
      if (n) set.add(n)
    }
  }
  return set
}

export default function useDiscover(localSongs) {
  const data = ref(null)       // 完整榜单数据
  const loading = ref(true)
  const activeChart = ref('hot') // 'hot' | 'rising' | 'new'
  const wishlist = ref(loadWishlist())

  onMounted(async () => {
    data.value = await loadToplist()
    loading.value = false
  })

  const charts = computed(() => {
    if (!data.value?.charts) return []
    return Object.values(data.value.charts).map((c) => ({
      key: c.key,
      name: c.name,
      count: c.tracks?.length || 0,
    }))
  })

  const currentTracks = computed(() => {
    return data.value?.charts?.[activeChart.value]?.tracks || []
  })

  const updatedAt = computed(() => data.value?.updatedAt || null)

  // 用网易云歌曲 id 作为唯一键，避免同一首歌在不同榜单重复收藏时出现两条
  const wishlistIds = computed(() => new Set(wishlist.value.map((t) => t.id)))

  function isWishlisted(track) {
    return wishlistIds.value.has(track.id)
  }

  // 匹配榜单项到本地库：
  // 1) title 归一化后双向包含（短名是长名的子串），且短的一方 ≥4 字，
  //    兼容「甲乙丙丁」↔「甲乙丙丁 (你我怎么两清)」「七里香」↔「七里香 Live」这类差异
  // 2) artist 集合有交集（防止不同歌同名）
  function titlesMatch(a, b) {
    if (!a || !b) return false
    if (a === b) return true
    // 1) 双向包含：短名是长名的子串（≥4字）
    const [short, long] = a.length <= b.length ? [a, b] : [b, a]
    if (short.length >= 4 && long.includes(short)) return true
    // 2) 最长公共前缀 ≥4 字：兼容《甲乙丙丁Strangers》↔《甲乙丙丁(你我怎么两清)》
    //    这类同歌不同后缀（英文副标题/中文注解/Live/录音室版）
    let prefix = 0
    while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++
    if (prefix >= 4) return true
    return false
  }

  // 单首榜单项匹配本地库：title 任一候选双向包含 + artist 任一候选交集
  function matchTrackInList(track, localList) {
    const trackTitle = normalizeText(track.name)
    if (!trackTitle) return null
    const trackArtists = new Set(
      String(track.artists ?? '').split(/[\/、,，·&]/).map(normalizeText).filter(Boolean),
    )
    for (const song of localList) {
      const localTitles = titleCandidates(song)
      const titleHit = localTitles.some((lt) => titlesMatch(lt, trackTitle))
      if (!titleHit) continue
      const localArtists = artistCandidates(song)
      for (const a of trackArtists) {
        if (localArtists.has(a)) return song
      }
    }
    return null
  }

  // 预计算当前榜单每首歌的本地匹配结果
  // 显式读 unref(localSongs) 建立响应式依赖：songList 变化时自动重算
  const localMatchMap = computed(() => {
    const localList = unref(localSongs) || []
    const map = new Map()
    for (const t of currentTracks.value) {
      map.set(t.id, matchTrackInList(t, localList))
    }
    return map
  })

  function toggleWishlist(track) {
    const idx = wishlist.value.findIndex((t) => t.id === track.id)
    if (idx >= 0) {
      wishlist.value.splice(idx, 1)
    } else {
      wishlist.value.push({
        id: track.id,
        name: track.name,
        artists: track.artists,
        album: track.album,
        cover: track.cover,
        addedAt: Date.now(),
      })
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist.value))
  }

  // 复制为纯文本清单，每行「歌手 - 歌名」，方便去音乐平台批量搜索下载
  function copyWishlistText() {
    const lines = wishlist.value.map((t) => `${t.artists} - ${t.name}`)
    return lines.join('\n')
  }

  function clearWishlist() {
    wishlist.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  function setChart(key) {
    activeChart.value = key
  }

  return {
    loading,
    charts,
    currentTracks,
    activeChart,
    setChart,
    updatedAt,
    wishlist,
    isWishlisted,
    localMatchMap,
    toggleWishlist,
    copyWishlistText,
    clearWishlist,
  }
}
