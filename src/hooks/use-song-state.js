import { reactive, ref } from 'vue';

// ---- 参数 ----
const DAY_MS = 24 * 3600 * 1000;
const SKIP_WINDOW_MS = 14 * DAY_MS;
const SKIP_THRESHOLD = 2;
const AUTO_COOLDOWN_MS = 21 * DAY_MS;
const MANUAL_COOLDOWN_MS = 28 * DAY_MS;
const NEW_SONG_WINDOW_MS = 14 * DAY_MS;
const SKIP_RATIO = 0.6;
const TIME_SIGMA = 3; // 时间匹配高斯衰减的标准差（小时）

export default function useSongState(musicDB, songListRef) {
  // sha → { lastPlayedAt, lastSkipAt, recentSkipCount }
  const stateMap = reactive(new Map());
  // sha → [24] 每小时播放次数
  const hourHistogram = new Map();

  const loaded = ref(false);

  async function init() {
    const events = await musicDB.getAllEvents();
    stateMap.clear();
    hourHistogram.clear();
    const now = Date.now();

    for (const ev of events) {
      const s = stateMap.get(ev.sha) || { lastPlayedAt: 0, lastSkipAt: 0, recentSkipCount: 0 };

      if (ev.at > s.lastPlayedAt) s.lastPlayedAt = ev.at;

      if (!ev.completed) {
        if (ev.at > s.lastSkipAt) s.lastSkipAt = ev.at;
        if (now - ev.at < SKIP_WINDOW_MS) s.recentSkipCount += 1;
      }

      stateMap.set(ev.sha, s);

      // 累计小时分布
      const hour = new Date(ev.at).getHours();
      if (!hourHistogram.has(ev.sha)) hourHistogram.set(ev.sha, new Array(24).fill(0));
      hourHistogram.get(ev.sha)[hour]++;
    }

    loaded.value = true;
  }

  async function recordPlay(sha, playedRatio) {
    const completed = playedRatio >= SKIP_RATIO;
    const event = { sha, at: Date.now(), completed, playedRatio };
    await musicDB.addEvent(event);

    const s = stateMap.get(sha) || { lastPlayedAt: 0, lastSkipAt: 0, recentSkipCount: 0 };
    s.lastPlayedAt = event.at;

    if (!completed) {
      s.lastSkipAt = event.at;
      s.recentSkipCount += 1;
    }
    stateMap.set(sha, s);

    // 增量更新小时分布
    const hour = new Date(event.at).getHours();
    if (!hourHistogram.has(sha)) hourHistogram.set(sha, new Array(24).fill(0));
    hourHistogram.get(sha)[hour]++;
  }

  async function manualCool(sha, days = 28) {
    await musicDB.update(sha, { manualCooledUntil: Date.now() + days * DAY_MS });
    const song = songListRef.value.find((s) => s.sha === sha);
    if (song) song.manualCooledUntil = Date.now() + days * DAY_MS;
  }

  async function unfreeze(sha) {
    await musicDB.update(sha, { manualCooledUntil: null });
    const song = songListRef.value.find((s) => s.sha === sha);
    if (song) song.manualCooledUntil = null;
  }

  function getState(song) {
    const now = Date.now();
    const s = stateMap.get(song.sha) || { lastPlayedAt: 0, lastSkipAt: 0, recentSkipCount: 0 };

    const manualCooled = song.manualCooledUntil && song.manualCooledUntil > now;

    const autoCooled =
      s.recentSkipCount >= SKIP_THRESHOLD &&
      s.lastSkipAt > 0 &&
      now - s.lastSkipAt < AUTO_COOLDOWN_MS;

    const isCooled = !!(manualCooled || autoCooled);

    let coolDownDays = 0;
    if (manualCooled) {
      coolDownDays = Math.ceil((song.manualCooledUntil - now) / DAY_MS);
    } else if (autoCooled) {
      coolDownDays = Math.ceil((s.lastSkipAt + AUTO_COOLDOWN_MS - now) / DAY_MS);
    }

    return {
      lastPlayedAt: s.lastPlayedAt || null,
      recentSkipCount: s.recentSkipCount,
      isCooled,
      coolDownDays: Math.max(0, coolDownDays),
      coolDownReason: manualCooled ? 'manual' : autoCooled ? 'auto' : null,
    };
  }

  // 时间匹配分：高斯衰减，返回 0.5~1.0（无数据=1，完全相反时段≈0.5）
  function timeScore(sha, targetHour) {
    const hist = hourHistogram.get(sha);
    if (!hist) return 1;

    const total = hist.reduce((a, b) => a + b, 0);
    if (total < 2) return 1; // 数据太少，不拟合

    let score = 0;
    for (let h = 0; h < 24; h++) {
      if (!hist[h]) continue;
      // 环形小时距离
      let diff = Math.abs(h - targetHour);
      diff = Math.min(diff, 24 - diff);
      score += hist[h] * Math.exp(-0.5 * Math.pow(diff / TIME_SIGMA, 2));
    }

    // 归一化到 0.5~1.0：避免错时段的歌完全被压制
    return 0.5 + 0.5 * (score / total);
  }

  // ---- 加权随机 ----
  function weightedPick(candidates, targetHour = new Date().getHours()) {
    if (!candidates.length) return null;
    const now = Date.now();

    const weights = candidates.map((song) => {
      const st = stateMap.get(song.sha) || { lastPlayedAt: 0, lastSkipAt: 0, recentSkipCount: 0 };

      // 基础权重：越久没听越容易被抽到
      const daysSincePlay = st.lastPlayedAt ? (now - st.lastPlayedAt) / DAY_MS : 365;
      let w = 1 + Math.log(1 + daysSincePlay);

      // 新歌蜜月
      const addedAt = song.addedAt || 0;
      if (addedAt > 0 && now - addedAt < NEW_SONG_WINDOW_MS) w *= 2;

      // 跳过惩罚
      w *= Math.pow(0.7, st.recentSkipCount);

      // 时间匹配
      w *= timeScore(song.sha, targetHour);

      return Math.max(w, 0.001);
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  return {
    stateMap,
    loaded,
    init,
    recordPlay,
    manualCool,
    unfreeze,
    getState,
    weightedPick,
    SKIP_RATIO,
    MANUAL_COOLDOWN_MS,
  };
}
