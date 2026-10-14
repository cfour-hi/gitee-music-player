// src/hooks/use-media-session.js
/**
 * Media Session 增强 —— 车机 / 蓝牙 / 方向盘按键适配
 *
 * 按键链路：物理键 → 系统媒体服务 → navigator.mediaSession action 回调（不经 DOM keydown）
 *
 * 覆盖：
 * - action：play / pause / previoustrack / nexttrack / seekbackward / seekforward / seekto / stop
 *   每个 action 单独 try/catch（iOS 等平台对不支持的 action 会抛 NotSupportedError）
 * - playbackState：让系统（车机 / 锁屏 / 通知栏）感知真实播放状态，
 *   由 audio 原生事件驱动，覆盖来电、蓝牙断连等系统级暂停
 * - positionState：进度同步（仅 Android Chrome 支持；iOS Safari 不支持，已 try/catch 降级）
 * - 自动播放策略：页面至少一次用户手势后，系统按键触发 play 才不会被浏览器拒绝
 *
 * 用法（App.vue <script setup> 顶层同步调用）：
 *   const mediaSession = useMediaSession({
 *     getAudioEl,          // () => <audio 元素>
 *     onPlay, onPause, onPrev, onNext,
 *     onPlayStateChange,   // (playing) => {}  可选：跟随真实播放状态
 *   });
 *   // 播放/切歌成功后调用 mediaSession.updateMetadata(activeSong)
 */
import { onBeforeUnmount } from 'vue';

const ACTIONS = [
  'play',
  'pause',
  'previoustrack',
  'nexttrack',
  'seekbackward',
  'seekforward',
  'seekto',
  'stop',
];

export default function useMediaSession({
  getAudioEl,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onPlayStateChange,
}) {
  const mediaSession = typeof navigator !== 'undefined' ? navigator.mediaSession : null;
  const boundEls = new Set();
  let lastPosSyncAt = 0;

  // 环境不支持 MediaSession 时返回空实现，调用方无需分叉
  if (!mediaSession) {
    return { updateMetadata() {}, sync() {}, syncPosition() {} };
  }

  // 每个 action 单独注册：部分平台不支持的 action 会抛 NotSupportedError
  function reg(action, handler) {
    try {
      mediaSession.setActionHandler(action, handler);
    } catch (err) {
      console.log(`MediaSession action "${action}" 不受当前浏览器支持，已跳过`);
    }
  }

  // 进度同步（iOS Safari 不支持 setPositionState，静默降级）
  function syncPosition(throttle = false) {
    const el = getAudioEl();
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    if (throttle) {
      const now = Date.now();
      if (now - lastPosSyncAt < 1000) return;
      lastPosSyncAt = now;
    }
    try {
      mediaSession.setPositionState({
        duration: el.duration,
        playbackRate: el.playbackRate || 1,
        position: Math.min(el.currentTime, el.duration),
      });
    } catch (err) {
      // iOS 不支持 setPositionState，此处忽略
    }
  }

  // 播放状态 + 进度同步。播放状态以 audio 真实状态为准，而非外部变量，
  // 这样来电 / 蓝牙断连等系统级暂停也能正确反映到车机和锁屏
  function sync() {
    const el = getAudioEl();
    const playing = el ? !el.paused : false;
    try {
      mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch (err) {}
    syncPosition();
  }

  // 命名 handler，便于 onBeforeUnmount 时精确移除
  function onAny() { sync(); }
  function onSeeked() { syncPosition(); }
  function onTimeUpdate() { syncPosition(true); }

  // 元数据：车机 / 锁屏 / 通知栏显示标题、歌手、专辑、封面
  function updateMetadata(song) {
    const tags = song?._tag?.tags;
    if (!tags) return;
    try {
      mediaSession.metadata = new MediaMetadata({
        title: tags.title || '',
        artist: tags.artist || '',
        album: tags.album || '未知专辑',
        // 注：iOS 锁屏封面要求公网 https URL，blob URL 可能不显示（Android 正常）
        artwork: song._cover
          ? [{ src: song._cover, sizes: '512x512', type: tags.picture?.format || 'image/jpeg' }]
          : [],
      });
    } catch (err) {
      console.log('MediaSession metadata 设置失败（已降级）');
    }
  }

  // 把 audio 原生事件接到同步链路上（元素出现后才绑定，轮询兜底）
  function ensureBound() {
    const el = getAudioEl();
    if (!el || boundEls.has(el)) return;
    boundEls.add(el);
    el.addEventListener('play', onAny);
    el.addEventListener('pause', onAny);
    el.addEventListener('ended', onAny);
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('timeupdate', onTimeUpdate);
    if (onPlayStateChange) {
      el.addEventListener('play', () => onPlayStateChange(true));
      el.addEventListener('pause', () => onPlayStateChange(false));
      el.addEventListener('ended', () => onPlayStateChange(false));
    }
  }

  // ---- 注册系统按键 action handlers ----
  reg('play', () => onPlay());
  reg('pause', () => onPause());
  reg('previoustrack', () => onPrev());
  reg('nexttrack', () => onNext());
  reg('seekbackward', (d) => {
    const el = getAudioEl();
    if (!el) return;
    el.currentTime = Math.max(0, el.currentTime - (d?.seekOffset ?? 10));
    syncPosition();
  });
  reg('seekforward', (d) => {
    const el = getAudioEl();
    if (!el) return;
    el.currentTime = Math.min(el.duration || el.currentTime, el.currentTime + (d?.seekOffset ?? 10));
    syncPosition();
  });
  reg('seekto', (d) => {
    const el = getAudioEl();
    if (!el || !Number.isFinite(d?.seekTime)) return;
    el.currentTime = Math.max(0, Math.min(d.seekTime, el.duration || d.seekTime));
    syncPosition();
  });
  reg('stop', () => onPause());

  // 自动播放解锁：系统按键触发 play 前，页面需至少一次用户手势，否则会被浏览器拒绝
  const unlock = () => document.removeEventListener('pointerdown', unlock);
  document.addEventListener('pointerdown', unlock, { once: true });

  // audio 元素可能在 PlayerBar 挂载后才出现，轮询补绑
  ensureBound();
  if (!getAudioEl()) {
    const timer = setInterval(() => {
      ensureBound();
      if (getAudioEl()) clearInterval(timer);
    }, 500);
    onBeforeUnmount(() => clearInterval(timer));
  }

  onBeforeUnmount(() => {
    ACTIONS.forEach((action) => {
      try { mediaSession.setActionHandler(action, null); } catch (err) {}
    });
    boundEls.forEach((el) => {
      el.removeEventListener('play', onAny);
      el.removeEventListener('pause', onAny);
      el.removeEventListener('ended', onAny);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('timeupdate', onTimeUpdate);
    });
  });

  return { updateMetadata, sync, syncPosition };
}
