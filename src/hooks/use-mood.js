import { ref } from 'vue';

// 三态情绪开关：🔥 偏燃（白天时段加权）、😐 适中、😌 偏缓（深夜时段加权）
const MOODS = [
  { key: 'energetic', label: '🔥', shiftHours: -3 },
  { key: 'neutral',   label: '😐', shiftHours: 0 },
  { key: 'calm',      label: '😌', shiftHours: 3 },
];

export default function useMood() {
  const mood = ref('neutral');

  function setMood(key) {
    mood.value = key;
  }

  // 当前情绪对应的时间偏移（小时）
  const shiftHours = () => {
    return MOODS.find((m) => m.key === mood.value)?.shiftHours || 0;
  };

  // 计算"目标小时"：当前时间 + 情绪偏移（处理跨天）
  function targetHour() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return (h + shiftHours() + 24) % 24;
  }

  return {
    moods: MOODS,
    mood,
    setMood,
    targetHour,
  };
}
