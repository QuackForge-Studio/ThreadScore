import OpenAI from 'openai';
import { MAX_AI_BATCH, MAX_RETRIES } from '../../shared/constants';
import { aiBatchSchema } from '../../shared/schemas';
import type { Label } from '../../shared/types';
import type { Env } from '../db';
import { lexiconScore } from './lexiconScorer';

export interface ScoreResult {
  score: number;
  label: Label;
  reason: string;
  model: string;
}

const SYSTEM_PROMPT = `Bạn là hệ thống phân tích cảm xúc cho comments trên mạng xã hội.
Nhiệm vụ: đánh giá MỨC ĐỘ TỨC GIẬN của mỗi comment, thang 0-100 (0 = vui vẻ nhất, 100 = tức giận nhất).
Phân loại: 70-100 => "BÙNG NỔ", 30-69 => "TRUNG LẬP", 0-29 => "VUI VẺ".
Trả về JSON object duy nhất với key "results" là mảng theo ĐÚNG thứ tự input:
{ "results": [ { "score": number, "label": "BÙNG NỔ"|"TRUNG LẬP"|"VUI VẺ", "reason": "1 câu giải thích ngắn" } ] }`;

function parseAiOutput(content: string, count: number): { score: number; label: Label; reason: string }[] {
  const parsed = JSON.parse(content);
  const batch = aiBatchSchema.parse(parsed.results);
  if (batch.length !== count) throw new Error(`AI trả về ${batch.length} kết quả, cần ${count}`);
  return batch;
}

async function callAIWithRetry(client: OpenAI, model: string, items: { text: string; context: string }[]): Promise<{ score: number; label: Label; reason: string }[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(items.map((it, i) => ({ index: i, comment: it.text, context: it.context }))) },
        ],
        temperature: 0,
      });
      const content = resp.choices[0]?.message?.content;
      if (!content) throw new Error('AI trả về rỗng');
      return parseAiOutput(content, items.length);
    } catch (e) {
      lastError = e;
      const delay = Math.min(60000, 1000 * 2 ** attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI failed');
}

export async function scoreCommentsWithAI(env: Env, items: { id: string; text: string; context: string }[]): Promise<ScoreResult[]> {
  const model = env.AI_MODEL ?? 'gemini-2.5-flash';
  const results: (ScoreResult | null)[] = new Array(items.length).fill(null);

  const doLexiconFallback = () => {
    items.forEach((it, i) => {
      if (results[i]) return;
      const lx = lexiconScore(it.text);
      results[i] = { ...lx, model: 'lexicon-fallback' };
    });
  };

  if (!env.AI_API_KEY) {
    doLexiconFallback();
    return results as ScoreResult[];
  }

  const client = new OpenAI({
    apiKey: env.AI_API_KEY,
    baseURL: env.AI_BASE_URL || undefined,
  });

  for (let start = 0; start < items.length; start += MAX_AI_BATCH) {
    const slice = items.slice(start, start + MAX_AI_BATCH);
    try {
      const scored = await callAIWithRetry(client, model, slice.map(s => ({ text: s.text, context: s.context })));
      scored.forEach((s, j) => { results[start + j] = { ...s, model }; });
    } catch {
      slice.forEach((_, j) => {
        const lx = lexiconScore(slice[j].text);
        results[start + j] = { ...lx, model: 'lexicon-fallback' };
      });
    }
  }

  return results as ScoreResult[];
}
