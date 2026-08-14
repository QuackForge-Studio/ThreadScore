import type { Label } from './types';

export const LABEL_DISPLAY: Record<Label, string> = {
  'BÙNG NỔ': 'Bùng nổ',
  'TRUNG LẬP': 'Trung lập',
  'VUI VẺ': 'Vui vẻ',
};

export const LABEL_COLORS: Record<Label, string> = {
  'BÙNG NỔ': '#e5484d',
  'TRUNG LẬP': '#8d8d8d',
  'VUI VẺ': '#2f9e6e',
};

export function labelFromScore(score: number): Label {
  if (score >= 70) return 'BÙNG NỔ';
  if (score >= 30) return 'TRUNG LẬP';
  return 'VUI VẺ';
}
