// 拉取网易云官方榜单，生成 src/data/toplist.json
// 在 CI (GitHub Actions) 中运行，无浏览器跨域限制。
// 只取元数据（歌名/歌手/封面）用于「发现新歌」，不涉及音频流。
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const api = require('NeteaseCloudMusicApi')

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../src/data')
const OUT_FILE = resolve(OUT_DIR, 'toplist.json')

// 网易云官方榜单歌单 ID
// 参考: https://music.163.com/#/discover/toplist
const CHARTS = [
  { key: 'hot', name: '热歌榜', id: 3778678 },
  { key: 'rising', name: '飙升榜', id: 19723756 },
  { key: 'new', name: '新歌榜', id: 3779629 },
]

const TOP_N = 50 // 每个榜单取前 N 首

async function fetchChart({ key, name, id }) {
  console.log(`→ 拉取 ${name} (id=${id}) ...`)
  const res = await api.playlist_detail({ id, s: 8 })
  if (res.status !== 200) {
    throw new Error(`${name} HTTP ${res.status}`)
  }
  const playlist = res.body?.playlist
  if (!playlist) {
    throw new Error(`${name} 返回结构异常: ${JSON.stringify(res.body).slice(0, 200)}`)
  }
  const tracks = (playlist.tracks || []).slice(0, TOP_N).map((t, i) => ({
    rank: i + 1,
    id: t.id,
    name: t.name,
    artists: (t.ar || []).map((a) => a.name).join(' / '),
    album: t.al?.name || '',
    cover: t.al?.picUrl ? `${t.al.picUrl}?param=200y200` : '',
    duration: t.dt || 0,
  }))
  console.log(`  ✓ ${tracks.length} 首`)
  return { key, name, id, tracks }
}

async function main() {
  const startedAt = Date.now()
  const results = {}
  for (const chart of CHARTS) {
    try {
      results[chart.key] = await fetchChart(chart)
    } catch (e) {
      console.error(`  ✗ ${chart.name} 失败:`, e.message)
      // 单个榜单失败不阻塞整体，保留空数组
      results[chart.key] = { key: chart.key, name: chart.name, id: chart.id, tracks: [] }
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    charts: results,
  }

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf-8')
  const total = Object.values(results).reduce((s, c) => s + c.tracks.length, 0)
  console.log(`\n✓ 已写入 ${OUT_FILE}`)
  console.log(`  共 ${total} 首, 耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
}

main().catch((e) => {
  console.error('fatal:', e)
  process.exit(1)
})
