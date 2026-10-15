<template>
  <div class="stats-page" @click.self="emit('close')">
    <div class="stats-panel">
      <!-- 顶栏 -->
      <div class="stats-header">
        <button class="close-btn" @click="emit('close')">
          <CloseOutlined />
        </button>
        <h2>听歌统计</h2>
        <div class="header-spacer" />
      </div>

      <div v-if="loading" class="stats-loading">加载中…</div>

      <template v-else-if="data">
        <!-- 总览数字 -->
        <div class="overview-grid">
          <div class="overview-cell">
            <div class="num">{{ data.overview.total }}</div>
            <div class="label">总播放</div>
          </div>
          <div class="overview-cell">
            <div class="num">{{ data.overview.completed }}</div>
            <div class="label">听完</div>
          </div>
          <div class="overview-cell">
            <div class="num warn">{{ data.overview.skipped }}</div>
            <div class="label">跳过</div>
          </div>
          <div class="overview-cell">
            <div class="num">{{ data.overview.skipRate }}%</div>
            <div class="label">跳过率</div>
          </div>
        </div>

        <!-- 24 小时分布 -->
        <section v-if="maxHour">
          <h3>听歌时段</h3>
          <div class="bar-chart hours">
            <div
              v-for="(v, i) in data.hours"
              :key="i"
              class="bar"
              :style="{ height: (v / maxHour) * 100 + '%' }"
              :title="`${i}点: ${v}次`"
            />
          </div>
          <div class="axis">
            <span>0</span><span>6</span><span>12</span><span>18</span><span>24</span>
          </div>
        </section>

        <!-- 最近 7 天 -->
        <section v-if="maxWeek">
          <h3>最近 7 天</h3>
          <div class="bar-chart week">
            <div
              v-for="(d, i) in data.week"
              :key="i"
              class="bar"
              :style="{ height: (d.count / maxWeek) * 100 + '%' }"
              :title="`${d.label}: ${d.count}次`"
            />
          </div>
          <div class="axis">
            <span v-for="(d, i) in data.week" :key="i">{{ d.label }}</span>
          </div>
        </section>

        <!-- Top 歌曲 -->
        <section v-if="data.topSongs.length">
          <h3>常听歌曲 Top {{ data.topSongs.length }}</h3>
          <ol class="top-list">
            <li v-for="(s, i) in data.topSongs" :key="s.sha">
              <span class="rank">{{ i + 1 }}</span>
              <span class="title">{{ s.title }}</span>
              <span class="artist">{{ s.artist }}</span>
              <span class="plays">{{ s.plays }}次</span>
            </li>
          </ol>
        </section>

        <!-- Top 歌手 -->
        <section v-if="data.topArtists.length">
          <h3>常听歌手 Top {{ data.topArtists.length }}</h3>
          <ol class="top-list">
            <li v-for="(a, i) in data.topArtists" :key="a.artist">
              <span class="rank">{{ i + 1 }}</span>
              <span class="title">{{ a.artist }}</span>
              <span class="plays">{{ a.plays }}次</span>
            </li>
          </ol>
        </section>

        <div v-if="!hasAny" class="empty">
          还没有播放记录，听几首歌再来看看～
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { CloseOutlined } from '@ant-design/icons-vue';
import useStats from '../hooks/use-stats';

const props = defineProps({
  musicDB: { type: Object, required: true },
  songList: { type: Object, required: true }, // ref
});
const emit = defineEmits(['close']);

const loading = ref(true);
const data = ref(null);

const { load } = useStats(props.musicDB, props.songList);

onMounted(async () => {
  try {
    data.value = await load();
  } finally {
    loading.value = false;
  }
});

const maxHour = computed(() => Math.max(...(data.value?.hours || [0])));
const maxWeek = computed(() => Math.max(...(data.value?.week?.map((d) => d.count) || [0])));
const hasAny = computed(() =>
  data.value && (
    data.value.overview.total > 0 ||
    data.value.topSongs.length > 0 ||
    data.value.topArtists.length > 0
  ),
);
</script>

<style scoped>
.stats-page {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.stats-panel {
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-bg-container);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--spacing-md) var(--spacing-lg) calc(var(--spacing-xl) + 0.5rem);
  color: var(--color-text);
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  h2 { font-size: var(--font-size-md); font-weight: 600; }
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  cursor: pointer;
  padding: var(--spacing-xs);
}

/* 总览 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}
.overview-cell {
  text-align: center;
  .num {
    font-size: var(--font-size-md);
    font-weight: 700;
    color: var(--color-primary);
    &.warn { color: var(--color-warning); }
  }
  .label {
    font-size: var(--font-size-caption);
    color: var(--color-text-secondary);
    margin-top: 0.04rem;
  }
}

/* 柱状图 */
section {
  margin-bottom: var(--spacing-lg);
  h3 {
    font-size: var(--font-size-base);
    margin-bottom: var(--spacing-sm);
    color: var(--color-text-secondary);
  }
}
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 3rem;
}
.bar-chart.hours .bar {
  flex: 1;
  background: var(--color-primary);
  border-radius: 2px 2px 0 0;
  min-height: 2px;
  opacity: 0.8;
}
.bar-chart.week .bar {
  flex: 1;
  background: var(--color-primary);
  border-radius: 2px 2px 0 0;
  min-height: 2px;
}
.axis {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-caption);
  color: var(--color-text-disabled);
  margin-top: 0.04rem;
}

/* Top 列表 */
.top-list {
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    display: flex;
    align-items: center;
    padding: var(--spacing-xs) 0;
    gap: var(--spacing-sm);
    border-bottom: 1px solid var(--color-border-divider);
    font-size: var(--font-size-base);
    .rank {
      color: var(--color-text-disabled);
      width: 1rem;
      flex-shrink: 0;
    }
    .title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .artist {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      max-width: 30%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .plays {
      color: var(--color-text-tertiary);
      font-size: var(--font-size-sm);
    }
  }
}

.empty, .stats-loading {
  text-align: center;
  color: var(--color-text-disabled);
  padding: var(--spacing-xl) 0;
}
</style>
