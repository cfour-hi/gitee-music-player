<template>
  <main class="song-list">
    <RecycleScroller
      v-if="songs.length > 0"
      v-slot="{ item: song }"
      class="scroller"
      :items="songs"
      :item-size="itemSize"
      key-field="sha"
      :buffer="200"
    >
      <SongItem
        :song="song"
        :active="activeSongSha === song.sha"
        :cooled="getSongState(song).isCooled"
        :cool-down-days="getSongState(song).coolDownDays"
        :hl="hl"
        @click="emit('clickSong', song.sha)"
        @touchstart="emit('itemTouchStart', song)"
        @touchend="emit('itemTouchEnd')"
        @touchmove="emit('itemTouchMove')"
        @contextmenu="emit('itemContextMenu', song)"
      />
    </RecycleScroller>

    <!-- 搜索空状态 -->
    <div v-else-if="searching && searchContent" class="search-empty">
      <div class="search-empty-title">
        <SearchOutlined class="empty-icon" />
        没有找到「{{ searchContent }}」相关的歌曲
      </div>
      <div class="search-empty-hint">
        试试：少输几个字 / 用歌手名或专辑名 / 检查错别字<br />
        支持拼音、首字母和繁体搜索
      </div>
    </div>

    <!-- 初始空状态（歌曲列表为空） -->
    <div v-else class="search-empty">
      <div class="search-empty-title">
        <InboxOutlined class="empty-icon" />
        还没有歌曲
      </div>
      <div class="search-empty-hint">
        点击左上角刷新按钮，从 Gitee 仓库拉取音乐文件
      </div>
    </div>
  </main>
</template>

<script setup>
import { SearchOutlined, InboxOutlined } from '@ant-design/icons-vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import SongItem from './SongItem.vue';

defineProps({
  songs: { type: Array, default: () => [] },
  activeSongSha: { type: String, default: null },
  getSongState: { type: Function, required: true },
  hl: { type: Function, required: true },
  searching: { type: Boolean, default: false },
  searchContent: { type: String, default: '' },
});

const emit = defineEmits([
  'clickSong',
  'itemTouchStart',
  'itemTouchEnd',
  'itemTouchMove',
  'itemContextMenu',
]);

// 歌曲项高度 = 封面 0.9rem + 上下 padding 0.16rem*2 = 1.22rem，加 1px border
const itemSize = ref(122);
function measureItemSize() {
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
  itemSize.value = Math.ceil(1.22 * fs) + 1;
}
onMounted(() => {
  measureItemSize();
  window.addEventListener('resize', measureItemSize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureItemSize);
});
</script>

<style scoped>
.song-list {
  flex: auto;
  overflow: hidden;
  position: relative;
}

.scroller {
  height: 100%;
}

.search-empty {
  text-align: center;
  padding: 1rem var(--spacing-lg);
  color: var(--color-text-disabled);
  font-size: var(--font-size-md);

  .search-empty-title {
    margin-bottom: var(--spacing-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .empty-icon {
    font-size: 1rem;
    opacity: 0.4;
  }

  .search-empty-hint {
    color: var(--color-text-quaternary);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-relaxed);
  }
}
</style>
