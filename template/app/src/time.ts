import tl from './timeline.json';
export const TL = tl as any;
export const DUR: number = TL.duration;
/** 片尾卡开始的时刻。 */
export const END: number = TL.end_card;
const L = (k: string) => { const l = TL.lines[k]; if (!l) throw new Error(`时间线里没有句子 ${k}（口播稿改过键？先重跑 timeline）`); return l; };
/** 某句配音开始的时刻。 */
export const T = (k: string): number => L(k).start;
/** 某句配音结束的时刻。 */
export const E = (k: string): number => L(k).end;
/** 某句配音里某个词被念出来的时刻（按配音文本找，数字要写成汉字）。off 是微调秒数。找不到会直接报错，不会悄悄对到句首。 */
export const K = (k: string, word: string, off = 0): number => {
  for (const c of L(k).clauses) {
    const i = c.text.indexOf(word);
    if (i >= 0) return c.start + (c.end - c.start) * (i / Math.max(1, c.text.length)) + off;
  }
  throw new Error(`K：${k} 这句里没有「${word}」（按配音文本找，数字要写成汉字）`);
};
