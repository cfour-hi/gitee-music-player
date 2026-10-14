<template>
  <main class="song-list">
    <template v-if="songs.length > 0">
      <SongItem
        v-for="song in songs"
        :key="song.sha"
        :song="song"
        :active="activeSongSha === song.sha"
        :cooled="getSongState(song).isCooled"
        :cool-down-days="getSongState(song).coolDownDays"
        :hl="hl"
        @click="emit('clickSong', $event)"
        @touchstart="emit('itemTouchStart', $event)"
        @touchend="emit('itemTouchEnd')"
        @touchmove="emit('itemTouchMove')"
        @contextmenu="emit('itemContextMenu', $event)"
      />
    </template>

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
</script>

<style scoped>
.song-list {
  flex: auto;
  overflow: auto;
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
