import { z } from 'zod';

export const aiOutputSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.enum(['BÙNG NỔ', 'TRUNG LẬP', 'VUI VẺ']),
  reason: z.string().max(500),
});

export const aiBatchSchema = z.array(aiOutputSchema).max(25);

export const commentInputSchema = z.object({
  external_id: z.string().max(100).nullable().optional(),
  author_username: z.string().max(200).nullable().optional(),
  author_name: z.string().max(200).nullable().optional(),
  text: z.string().min(1).max(10000),
  like_count: z.number().int().min(0).default(0),
  posted_at: z.number().int().nullable().optional(),
  parent_id: z.string().max(100).nullable().optional(),
  reply_to_username: z.string().max(200).nullable().optional(),
});

export const importPayloadSchema = z.object({
  url: z.string().min(1),
  title: z.string().max(2000).nullable().optional(),
  content: z.string().max(20000).nullable().optional(),
  author_username: z.string().max(200).nullable().optional(),
  author_name: z.string().max(200).nullable().optional(),
  posted_at: z.number().int().nullable().optional(),
  main_post_id: z.string().max(100).nullable().optional(),
  comments: z.array(commentInputSchema).max(1000),
});

export const requestSchema = z.object({ url: z.string().min(1).max(2000) });

export const voteSchema = z.object({
  comment_id: z.string().uuid(),
  vote: z.enum(['correct', 'incorrect']),
});

export const userCommentSchema = z.object({
  thread_id: z.string().uuid(),
  display_name: z.string().max(100).nullable().optional(),
  content: z.string().min(1).max(5000),
});
