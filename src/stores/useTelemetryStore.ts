import React, { useEffect, useRef } from 'react';
import { SUPABASE_URL } from '../App';

export interface TelemetryEvent {
  session_id: string;
  avg_word_length: number;
  clause_nesting_index: number;
  motor_jitter_ms: number;
  payload: {
    event_type: 'keystroke_batch' | 'paste_scan' | 'decode_submit';
    linguistic_precision: number;
    delta_divergence: number;
    resource_shunting_active: boolean;
    biorhythm_23d_phase: number;
    surface_pressure: number;
    word_count: number;
    timestamp: number;
  };
}

const BATCH_LIMIT = 15;
const SMART_SERVICE_ENDPOINT = `${SUPABASE_URL}/functions/v1/smart-service`;
const BASELINE_JITTER_MS = 45.0; // Empirical baseline for Delta > 1.482 resource-shunting detection
const ORIGIN_EPOCH_MS = Date.UTC(1985, 7, 15, 19, 39, 0); // Temporal seed: 1985-08-15 19:39 UTC

let queue: TelemetryEvent[] = [];

/** Computes real CMTE v2.0 stylometric and biophysical metrics from active text */
export function computeCMTEMetrics(text: string, motorJitterMs: number, surfacePressure: number) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const totalChars = words.reduce((sum, w) => sum + w.replace(/[^\w]/g, '').length, 0);
  const avgWordLength = wordCount > 0 ? +(totalChars / wordCount).toFixed(2) : 0;

  // Linguistic Precision telemetry: mu_w * 1.35
  const linguisticPrecision = +(avgWordLength * 1.35).toFixed(3);

  // Syntactic Clause Nesting Index
  const sentences = Math.max(1, (trimmed.match(/[.!?]+/g) || []).length);
  const clauses = (
    trimmed.match(/[,;:—–()-]+|\b(and|but|because|although|though|if|when|while|since|unless)\b/gi) || []
  ).length;
  const clauseNestingIndex = wordCount > 0 ? +(1 + clauses / sentences).toFixed(2) : 0;

  // Dynamic Cognitive-Motor Resource Shunting (Delta > 1.482 threshold)
  const deltaDivergence = +(motorJitterMs / BASELINE_JITTER_MS).toFixed(3);
  const resourceShuntingActive = deltaDivergence > 1.482;

  // 23-Day Physical Biorhythm Sinusoidal Axis
  const daysElapsed = (Date.now() - ORIGIN_EPOCH_MS) / (1000 * 60 * 60 * 24);
  const biorhythm23dPhase = +Math.sin((2 * Math.PI * daysElapsed) / 23).toFixed(4);

  return {
    avg_word_length: avgWordLength,
    clause_nesting_index: clauseNestingIndex,
    linguistic_precision: linguisticPrecision,
    delta_divergence: deltaDivergence,
    resource_shunting_active: resourceShuntingActive,
    biorhythm_23d_phase: biorhythm23dPhase,
    surface_pressure: surfacePressure,
    word_count: wordCount,
  };
}

export const useTelemetryStore = {
  pushEvent(event: TelemetryEvent) {
    queue.push(event);
    if (queue.length >= BATCH_LIMIT) {
      this.flushBatch();
    }
  },

  async flushBatch() {
    if (queue.length === 0) return;
    const batch = [...queue];
    queue = [];

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
    };

    try {
      await fetch(SMART_SERVICE_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ batch }),
        keepalive: true,
      });
    } catch {
      // Fail-open adiabatic guard: never block UI or Stripe checkout
    }
  },
};

export const TelemetryTracker: React.FC<{ sessionId: string; activeText: string }> = ({
  sessionId,
  activeText,
}) => {
  const lastKeyTime = useRef<number>(0);
  const keyIntervals = useRef<number[]>([]);
  const lastPressure = useRef<number>(0.5);
  const activeTextRef = useRef<string>(activeText);

  useEffect(() => {
    activeTextRef.current = activeText;
  }, [activeText]);

  useEffect(() => {
    const getMotorJitter = () => {
      const intervals = keyIntervals.current;
      if (intervals.length < 2) return 0;
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
      return +Math.sqrt(variance).toFixed(2);
    };

    const recordEvent = (eventType: 'keystroke_batch' | 'paste_scan') => {
      const jitter = getMotorJitter();
      const metrics = computeCMTEMetrics(activeTextRef.current, jitter, lastPressure.current);

      useTelemetryStore.pushEvent({
        session_id: sessionId,
        avg_word_length: metrics.avg_word_length,
        clause_nesting_index: metrics.clause_nesting_index,
        motor_jitter_ms: jitter,
        payload: {
          event_type: eventType,
          linguistic_precision: metrics.linguistic_precision,
          delta_divergence: metrics.delta_divergence,
          resource_shunting_active: metrics.resource_shunting_active,
          biorhythm_23d_phase: metrics.biorhythm_23d_phase,
          surface_pressure: metrics.surface_pressure,
          word_count: metrics.word_count,
          timestamp: Date.now(),
        },
      });
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pressure > 0) {
        lastPressure.current = +e.pressure.toFixed(3);
      }
    };

    const handleKeyDown = () => {
      const now = performance.now();
      if (lastKeyTime.current > 0) {
        const interval = now - lastKeyTime.current;
        if (interval > 10 && interval < 2000) {
          keyIntervals.current.push(interval);
          if (keyIntervals.current.length > 50) keyIntervals.current.shift();
        }
      }
      lastKeyTime.current = now;
    };

    const handleKeyUp = () => {
      if (keyIntervals.current.length > 0 && keyIntervals.current.length % 5 === 0) {
        recordEvent('keystroke_batch');
      }
    };

    const handlePaste = () => {
      setTimeout(() => recordEvent('paste_scan'), 50);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        useTelemetryStore.flushBatch();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('keyup', handleKeyUp, { passive: true });
    window.addEventListener('paste', handlePaste, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      useTelemetryStore.flushBatch();
    };
  }, [sessionId]);

  return null;
};
