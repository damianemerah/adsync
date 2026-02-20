// --- TYPES ---
export interface Creative {
  id: string;
  name: string | null;
  media_type: string | null;
  original_url: string;
  width: number | null;
  height: number | null;
  file_size_bytes: number | null;
  created_at: string | null;
  generation_prompt?: string | null;
  // Local UI state (not from DB)
  usageCount?: number;
  isLive?: boolean;
  status?: "ready" | "queued" | "uploading" | "done";
}
