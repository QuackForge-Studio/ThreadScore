export type Label = 'BÙNG NỔ' | 'TRUNG LẬP' | 'VUI VẺ';
export type ScoringStatus = 'pending_scoring' | 'scoring' | 'scored';
export type RequestStatus = 'pending' | 'fulfilled' | 'not_found' | 'error';

export interface ThreadRecord {
  id: string;
  url: string;
  title: string | null;
  content: string | null;
  author_username: string | null;
  author_name: string | null;
  posted_at: number | null;
  total_comments: number;
  scoring_status: ScoringStatus;
  avg_anger_score: number | null;
  score_breakdown: string | null;
  created_at: number;
}

export interface CommentRecord {
  id: string;
  thread_id: string;
  external_id: string | null;
  author_username: string | null;
  author_name: string | null;
  text: string;
  like_count: number;
  posted_at: number | null;
  created_at: number;
}

export interface AiScoreRecord {
  id: string;
  comment_id: string;
  score: number;
  label: Label;
  reason: string | null;
  model: string;
  created_at: number;
}

export interface RequestRecord {
  id: string;
  url: string;
  status: RequestStatus;
  requested_by: string | null;
  error_message: string | null;
  thread_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface VoteRecord {
  id: string;
  comment_id: string;
  user_id: string | null;
  vote: 'correct' | 'incorrect';
  created_at: number;
}

export interface UserCommentRecord {
  id: string;
  thread_id: string;
  user_id: string | null;
  display_name: string | null;
  content: string;
  created_at: number;
}

export interface OverallStats {
  threads: number;
  comments: number;
  avg_anger: number | null;
  breakdown: { bang_no: number; trung_lap: number; vui_ve: number };
  top_threads: Array<Pick<ThreadRecord, 'id' | 'title' | 'avg_anger_score' | 'total_comments'>>;
}

export interface ImportCommentInput {
  external_id?: string | null;
  author_username?: string | null;
  author_name?: string | null;
  text: string;
  like_count?: number;
  posted_at?: number | null;
}

export interface ImportPayload {
  url: string;
  title?: string | null;
  content?: string | null;
  author_username?: string | null;
  author_name?: string | null;
  posted_at?: number | null;
  comments: ImportCommentInput[];
}
