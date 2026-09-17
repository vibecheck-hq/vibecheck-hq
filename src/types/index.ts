export type Severity = 'info' | 'warning' | 'error' | 'critical';
export type NodeStatus = 'healthy' | 'degraded' | 'critical';

export interface TelemetryEvent {
  id: string;
  user_id: string;
  source: string;
  event_type: string;
  severity: Severity;
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface StylometryVector {
  id: string;
  user_id: string;
  sample_label: string;
  lexical_diversity: number;
  syntactic_complexity: number;
  structural_entropy: number;
  readability_score: number;
  sentiment_polarity: number;
  vector_hash: string;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  user_id: string;
  node_id: string;
  throughput: number;
  latency_ms: number;
  entropy_bits: number;
  energy_abs: number;
  status: NodeStatus;
  recorded_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_cents: number;
  stripe_price_id: string | null;
  features: string[];
  sort_order: number;
}

export interface AuthUser {
  id: string;
  email: string;
}
