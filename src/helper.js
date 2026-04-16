const AUDIO_EXTS = ['mp3', 'm4a', 'flac', 'ogg', 'wav'];
export const isAudio = (o) => AUDIO_EXTS.includes(o.path?.split('.').pop()?.toLowerCase());