import type { Label } from './types';

export const LABEL_DISPLAY: Record<Label, string> = {
  'BÙNG NỔ': 'Bùng nổ',
  'TRUNG LẬP': 'Trung lập',
  'VUI VẺ': 'Vui vẻ',
};

export const LABEL_COLORS: Record<Label, string> = {
  'BÙNG NỔ': '#DC3D1E',
  'TRUNG LẬP': '#9A8A78',
  'VUI VẺ': '#2A6F8E',
};

export function labelFromScore(score: number): Label {
  if (score >= 70) return 'BÙNG NỔ';
  if (score >= 30) return 'TRUNG LẬP';
  return 'VUI VẺ';
}
