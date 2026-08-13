import { labelFromScore } from '../../shared/labels';
import type { Label } from '../../shared/types';

const ANGRY_VI = ['ghét', 'căm thù', 'cút', 'ngu', 'ngu xuẩn', 'điên', 'điên tiết', 'bực', 'tức', 'tức giận', 'chửi', 'vô học', 'rác rưởi', 'khốn', 'dốt', 'đồ ngu', 'bực mình', 'phát điên', 'khinh', 'bẩn', 'thối'];
const ANGRY_EN = ['hate', 'stupid', 'idiot', 'fuck', 'shit', 'angry', 'mad', 'furious', 'ridiculous', 'awful', 'terrible', 'disgusting', 'pathetic', 'moron', 'dumb', 'suck'];
const POS_VI = ['yêu', 'thích', 'tuyệt', 'tuyệt vời', 'vui', 'hạnh phúc', 'cảm ơn', 'cười', 'dễ thương', 'xinh', 'đẹp', 'giỏi', 'xuất sắc', 'hài', 'buồn cười', 'mê', 'phê'];
const POS_EN = ['love', 'like', 'great', 'awesome', 'amazing', 'happy', 'thank', 'thanks', 'nice', 'beautiful', 'excellent', 'funny', 'cool', 'best', 'wonderful', 'enjoy'];

function countHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const w of words) {
    // match as whole word when word has >= 3 chars and is ascii, else substring
    const re = /^[a-z0-9 ]+$/.test(w)
      ? new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`, 'i')
      : new RegExp(w, 'i');
    if (re.test(lower)) hits++;
  }
  return hits;
}

export function lexiconScore(text: string): { score: number; label: Label; reason: string } {
  const trimmed = text.trim();
  if (!trimmed) return { score: 50, label: 'TRUNG LẬP', reason: 'Không có nội dung để đánh giá' };

  const angry = countHits(trimmed, [...ANGRY_VI, ...ANGRY_EN]);
  const pos = countHits(trimmed, [...POS_VI, ...POS_EN]);

  let score: number;
  if (angry === 0 && pos === 0) score = 50;
  else score = Math.round(50 + Math.min(50, angry * 18) - Math.min(50, pos * 18));
  score = Math.max(0, Math.min(100, score));

  const label = labelFromScore(score);
  const reason = angry > 0 && pos > 0
    ? `Phát hiện ${angry} từ tức giận và ${pos} từ tích cực`
    : angry > 0
      ? `Phát hiện ${angry} từ ngữ tức giận`
      : pos > 0
        ? `Phát hiện ${pos} từ ngữ tích cực`
        : 'Không phát hiện từ ngữ cảm xúc mạnh';
  return { score, label, reason };
}
