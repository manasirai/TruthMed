export type VerdictType =
  | 'supported'
  | 'mostly_supported'
  | 'misleading'
  | 'mostly_false'
  | 'false'
  | 'insufficient_evidence';

export interface EvidenceSource {
  title: string;
  publisher: string;
  url: string | null;
  publication_date: string | null;
  relevance_note: string;
  source_tier: 'primary' | 'secondary' | 'tertiary';
}

export interface FactCheckResult {
  id: string;
  request_id: string;
  verdict: VerdictType;
  verdict_label: string;
  claim_text: string;
  claim_type: string;
  short_answer: string;
  what_evidence_says: string;
  why_accurate_or_not: string;
  supporting_evidence: string;
  contradicting_evidence: string;
  missing_context: string;
  what_to_do_next: string;
  when_to_seek_care: string;
  sources: EvidenceSource[];
  retrieval_status: string;
  analyzed_at: string;
}

export interface FactCheckHistoryItem {
  id: string;
  request_id: string;
  claim_text: string;
  verdict: VerdictType;
  verdict_label: string;
  claim_type: string;
  analyzed_at: string;
}

export interface OrganSummary {
  id: string;
  name: string;
  system: string;
  color: string;
  position_x: number;
  position_y: number;
  position_z: number;
}

export interface OrganSource {
  title: string;
  publisher: string;
  url: string | null;
}

export interface OrganDetail {
  id: string;
  name: string;
  system: string;
  location: string;
  main_function: string;
  major_structures: string;
  system_interactions: string;
  health_facts: string;
  common_conditions: string;
  symptoms: string;
  prevention: string;
  when_to_seek_care: string;
  last_reviewed: string;
  content_source: string;
  position_x: number;
  position_y: number;
  position_z: number;
  color: string;
  sources: OrganSource[];
}

export interface ApiError {
  detail: string;
}
