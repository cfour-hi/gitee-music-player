<template>
  <div class="discover-overlay">
    <!-- 顶栏 -->
    <div class="discover-header">
      <button class="icon-btn" @click="emit('close')" title="关闭">
        <CloseOutlined />
      </button>
      <div class="discover-title">
        发现
        <span v-if="updatedAt" class="discover-updated">
          更新于 {{ formatDate(updatedAt) }}
        </span>
      </div>
      <button
        v-if="wishlist.length > 0"
        class="header-action"
        @click="copyAndToast"
      >
        <CopyOutlined />
        复制清单 ({{ wishlist.length }})
      </button>
      <div v-else class="header-action-placeholder" />
    </div>

    <!-- 榜单切换 -->
    <div v-if="charts.length > 0" class="chart-segment">
      <button
        v-for="c in charts"
        :key="c.key"
        class="chart-btn"
        :class="{ active: activeChart === c.key }"
        @click="setChart(c.key)"
      >
        {{ c.name }}
        <span class="chart-count">{{ c.count }}</span>
      </button>
    </div>

    <!-- 歌曲列表 -->
    <div class="discover-list">
      <template v-if="currentTracks.length > 0">
        <div
          v-for="track in currentTracks"
          :key="track.id"
          class="discover-item"
          :class="{ 'in-library': localMatchMap.get(track.id) }"
          @click="onItemClick(track)"
        >
          <div class="track-rank" :class="{ top: track.rank <= 3 }">
            {{ track.rank }}
          </div>
          <img
            v-if="track.cover"
            :src="track.cover"
            class="track-cover"
            alt=""
            loading="lazy"
          />
          <div v-else class="track-cover track-cover-placeholder">
            <CaretRightFilled />
          </div>
          <div class="track-info">
            <div class="track-name ellipsis">
              {{ track.name }}
              <span v-if="localMatchMap.get(track.id)" class="in-lib-badge">
                已入库
              </span>
            </div>
            <div class="track-artist ellipsis">
              {{ track.artists }}
              <span v-if="track.album" class="track-album">· {{ track.album }}</span>
            </div>
          </div>

          <!-- 已入库：播放按钮；未入库：收藏按钮 -->
          <button
            v-if="localMatchMap.get(track.id)"
            class="lib-btn"
            title="播放本地"
            @click.stop="emit('play-local', localMatchMap.get(track.id))"
          >
            <CaretRightFilled />
          </button>
          <button
            v-else
            class="wishlist-btn"
            :class="{ active: isWishlisted(track) }"
            @click.stop="toggleWishlist(track)"
            :title="isWishlisted(track) ? '移除待下载' : '加入待下载'"
          >
            <CheckOutlined v-if="isWishlisted(track)" />
            <PlusOutlined v-else />
          </button>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else-if="!loading" class="discover-empty">
        <CompassOutlined class="empty-icon" />
        <div class="empty-title">暂无榜单数据</div>
        <div class="empty-hint">
          CI 每日 8:00 自动拉取；本地开发请先运行<br />
          <code>node scripts/fetch-toplist.mjs</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  CloseOutlined,
  CaretRightFilled,
  CheckOutlined,
  PlusOutlined,
  CopyOutlined,
  CompassOutlined,
} from '@ant-design/icons-vue'
import useDiscover from '../hooks/use-discover'
import { useToast } from '../hooks/use-toast'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  localSongs: { type: Object, default: null }, // 传入 songList ref
})
const emit = defineEmits(['close', 'play-local'])

const { toast } = useToast()

const {
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
} = useDiscover(props.localSongs)

function formatDate(iso) {
  const d = new Date(iso)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${m}-${day}`
}

// 整行点击：已入库则播放本地；未入库则 toggle 收藏
function onItemClick(track) {
  const local = localMatchMap.value.get(track.id)
  if (local) {
    emit('play-local', local)
  } else {
    toggleWishlist(track)
  }
}

async function copyAndToast() {
  const text = copyWishlistText()
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`已复制 ${wishlist.value.length} 首待下载歌曲`)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      toast.success('已复制待下载清单')
    } catch {
      toast.error('复制失败，请手动选择')
    }
    document.body.removeChild(ta)
  }
}
</script>

<style scoped>
.discover-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-bg-base);
  z-index: var(--z-index-action-sheet);
  display: flex;
  flex-direction: column;
  animation: fadeIn var(--motion-duration-normal) var(--motion-ease);
}

/* 顶栏 */
.discover-header {
  flex: 0 0 1.2rem;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md);
  border-bottom: 1px solid var(--color-border-divider);
}

.icon-btn {
  width: var(--icon-btn-size);
  height: var(--icon-btn-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.discover-title {
  flex: auto;
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.discover-updated {
  font-size: var(--font-size-caption);
  font-weight: normal;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.header-action {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  height: var(--btn-height-sm);
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  white-space: nowrap;
}

.header-action-placeholder {
  width: 0.6rem;
}

/* 榜单切换 */
.chart-segment {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-divider);
}

.chart-btn {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-ease);
}

.chart-btn.active {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.chart-count {
  margin-left: 4px;
  font-size: var(--font-size-caption);
  opacity: 0.7;
}

/* 歌曲列表 */
.discover-list {
  flex: auto;
  overflow: auto;
}

.discover-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-divider);
  gap: var(--spacing-md);
  cursor: default;
  transition: background var(--motion-duration-fast) var(--motion-ease);
}

.discover-item.in-library {
  cursor: pointer;
}

.discover-item.in-library:hover {
  background: var(--color-bg-hover);
}

.track-rank {
  flex-shrink: 0;
  width: 0.4rem;
  text-align: center;
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.track-rank.top {
  color: var(--color-primary);
}

.track-cover {
  flex-shrink: 0;
  width: 0.9rem;
  height: 0.9rem;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-bg-container);
}

.track-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 0.3rem;
}

.track-info {
  flex: auto;
  min-width: 0;
}

.track-name {
  color: var(--color-text);
  font-size: var(--font-size-base);
  font-weight: 500;
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-xs);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.in-lib-badge {
  flex-shrink: 0;
  font-size: var(--font-size-caption);
  font-weight: normal;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.track-artist {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-tight);
}

.track-album {
  color: var(--color-text-quaternary);
}

.wishlist-btn,
.lib-btn {
  flex-shrink: 0;
  width: 0.56rem;
  height: 0.56rem;
  border-radius: var(--radius-round);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-ease);
}

.wishlist-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.lib-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

/* 空状态 */
.discover-empty {
  text-align: center;
  padding: 1.5rem var(--spacing-lg);
  color: var(--color-text-disabled);
}

.empty-icon {
  font-size: 1rem;
  opacity: 0.4;
  margin-bottom: var(--spacing-md);
}

.empty-title {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.empty-hint {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

.empty-hint code {
  font-family: monospace;
  background: var(--color-bg-container);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
