export type VerificationStatus = 
  | 'VERIFIED'
  | 'CONFLICT'
  | 'AI_INFERRED'
  | 'ENRICHED'
  | 'NEEDS_REVIEW'
  | 'UNVERIFIED';

export type ConflictType = 
  | 'VALUE_CONFLICT'
  | 'IDENTITY_CONFLICT'
  | 'CONTEXT_CONFLICT';

export type ResolutionStatus = 
  | 'RESOLVED'
  | 'UNRESOLVED'
  | 'NEEDS_HUMAN_REVIEW';

export interface ProductIdentity {
  brand?: string;
  product_name: string;
  model?: string;
  mpn?: string;
  sku?: string;
  category?: string;
  variant?: string;
  image_url?: string;
  identity_confidence: number;
  identity_status: 'VERIFIED' | 'NEEDS_REVIEW' | 'UNVERIFIED';
  possible_matches?: Array<{
    brand?: string;
    product_name: string;
    model?: string;
    mpn?: string;
  }>;
}

export interface NormalizedValue {
  value?: any;
  unit?: string;
}

export interface ProductAttribute {
  id?: string;
  attribute_name: string;
  category: string;
  value?: string;
  normalized_value?: NormalizedValue;
  unit?: string;
  source_name?: string;
  source_url?: string;
  source_type?: string;
  evidence_snippet?: string;
  page_number?: number;
  section?: string;
  confidence: number;
  confidence_reason?: string;
  verification_status: VerificationStatus;
  extraction_method?: string;
  last_verified_at?: string;
}

export interface Source {
  id?: string;
  title?: string;
  url?: string;
  domain?: string;
  source_type: string;
  authority_score: number;
  is_official: boolean;
  attributes_extracted_count?: number;
  retrieved_at?: string;
}

export interface CompetingValue {
  source_name: string;
  source_url?: string;
  source_type: string;
  authority_score: number;
  value: string;
  evidence_snippet?: string;
}

export interface Conflict {
  id?: string;
  attribute_name: string;
  conflict_type: ConflictType;
  competing_values: CompetingValue[];
  resolution_status: ResolutionStatus;
  resolved_value?: string;
  resolution_reason?: string;
}

export interface CommerceMetadata {
  marketing_title?: string;
  short_description?: string;
  feature_bullets?: string[];
  search_keywords?: string[];
  technical_summary?: string;
}

export interface ConfidenceScores {
  identity_confidence: number;
  data_completeness: number;
  verification_rate: number;
  verified_attributes_count: number;
  conflicts_count: number;
  needs_review_count: number;
  missing_attributes_count: number;
}

export interface Product {
  id: string;
  identity: ProductIdentity;
  attributes: ProductAttribute[];
  sources: Source[];
  conflicts: Conflict[];
  commerce_metadata?: CommerceMetadata;
  confidence_scores?: ConfidenceScores;
  created_at: string;
  updated_at: string;
}

export interface AnalysisJobStatus {
  job_id: string;
  product_id?: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  current_node: string;
  progress: number;
  message: string;
  error_message?: string;
  result_summary?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface AnalysisHistoryItem {
  job_id: string;
  product_id?: string;
  input_product_name?: string;
  input_model?: string;
  status: string;
  progress: number;
  created_at: string;
}
