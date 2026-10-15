import { describe, it, expect } from 'vitest';
import { parseLRC } from '../use-lyrics';
import { normalizeText, buildSongIndex, buildKeywords, songMatches } from '../use-music-search';
import { titlesMatch } from '../use-discover';

describe('parseLRC', () => {
  it('解析标准时间戳', () => {
    const lines = parseLRC('[00:12.00]我们的开始');
    expect(lines).toHaveLength(1);
    expect(lines[0].time).toBeCloseTo(12);
    expect(lines[0].text).toBe('我们的开始');
  });

  it('一行多个时间标签拆成多条', () => {
    const lines = parseLRC('[00:12.00][00:15.50]同一句歌词');
    expect(lines).toHaveLength(2);
    expect(lines[0].time).toBeCloseTo(12);
    expect(lines[1].time).toBeCloseTo(15.5);
    expect(lines[0].text).toBe('同一句歌词');
  });

  it('跳过元信息行 [ti:]/[ar:]', () => {
    const lrc = `[ti:七里香]
[ar:周杰伦]
[00:01.00]窗外的麻雀`;
    const lines = parseLRC(lrc);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('窗外的麻雀');
  });

  it('按时间升序输出', () => {
    const lines = parseLRC('[00:30.00]第三句\n[00:05.00]第一句\n[00:15.00]第二句');
    expect(lines.map((l) => l.text)).toEqual(['第一句', '第二句', '第三句']);
  });

  it('空输入返回空数组', () => {
    expect(parseLRC('')).toEqual([]);
    expect(parseLRC(null)).toEqual([]);
  });

  it('支持整分钟和毫秒三种格式', () => {
    expect(parseLRC('[01:02]a')[0].time).toBeCloseTo(62);
    expect(parseLRC('[01:02.5]a')[0].time).toBeCloseTo(62.5);
    expect(parseLRC('[01:02.500]a')[0].time).toBeCloseTo(62.5);
  });
});

describe('normalizeText', () => {
  it('繁转简（字符级）', () => {
    // opencc-js t2cn 做字符映射：軟→软, 體→体（不做词组级"软件"替换）
    expect(normalizeText('軟體')).toBe('软体');
    expect(normalizeText('車')).toBe('车');
  });
  it('小写+去标点', () => {
    expect(normalizeText('Hello, World!')).toBe('helloworld');
  });
  it('数字保留', () => {
    expect(normalizeText('七里香2004')).toBe('七里香2004');
  });
  it('null/undefined 安全', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('songMatches', () => {
  function idx(title, artist) {
    return buildSongIndex({ _tag: { tags: { title, artist, album: '' } }, path: '' });
  }

  it('原文子串命中歌名', () => {
    const i = idx('七里香', '周杰伦');
    expect(songMatches(i, buildKeywords('七里'))).toBe(true);
  });

  it('拼音全拼命中', () => {
    const i = idx('七里香', '周杰伦');
    expect(songMatches(i, buildKeywords('qilixiang'))).toBe(true);
  });

  it('拼音首字母命中', () => {
    const i = idx('七里香', '周杰伦');
    expect(songMatches(i, buildKeywords('qlx'))).toBe(true);
  });

  it('多关键词 AND', () => {
    const i = idx('七里香', '周杰伦');
    expect(songMatches(i, buildKeywords('周杰伦 七里'))).toBe(true);
    expect(songMatches(i, buildKeywords('周杰伦 稻香'))).toBe(false);
  });

  it('英文歌原样保留', () => {
    const i = idx('Love Story', 'Taylor Swift');
    expect(songMatches(i, buildKeywords('love'))).toBe(true);
    expect(songMatches(i, buildKeywords('taylor'))).toBe(true);
  });
});

describe('titlesMatch', () => {
  it('完全相等', () => {
    expect(titlesMatch('七里香', '七里香')).toBe(true);
  });

  it('双向包含（短名≥4字）', () => {
    expect(titlesMatch('一路向北', '一路向北 Live')).toBe(true);
    expect(titlesMatch('一路向北 Live', '一路向北')).toBe(true);
  });

  it('短名不足4字不匹配', () => {
    expect(titlesMatch('晴天', '晴天Live版')).toBe(false);
  });

  it('公共前缀≥4字', () => {
    expect(titlesMatch('甲乙丙丁Strangers', '甲乙丙丁(你我怎么两清)')).toBe(true);
  });

  it('完全不同的歌不匹配', () => {
    expect(titlesMatch('七里香', '稻香')).toBe(false);
  });
});
