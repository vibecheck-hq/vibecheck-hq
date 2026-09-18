import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface PointerSample {
  type: string;
  x: number;
  y: number;
  pressure: number;
  tilt_x: number;
  tilt_y: number;
  velocity: number;
  ts: number;
}

interface SessionBuffer {
  samples: PointerSample[];
  prev_x: number;
  prev_y: number;
  prev_ts: number;
}

const DEBOUNCE_MS = 300;
const FLUSH_INTERVAL_MS = 30_000;
const MIN_SAMPLES_TO_FLUSH = 5;

function computeHash(samples: PointerSample[]): string {
  const str = samples.map((s) => `${s.velocity.toFixed(3)}:${s.pressure.toFixed(3)}`).join('|');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function useTelemetryStream() {
  const { user } = useAuth();
  const bufferRef = useRef<SessionBuffer>({ samples: [], prev_x: 0, prev_y: 0, prev_ts: 0 });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const flushBuffer = useCallback(async () => {
    const buf = bufferRef.current;
    if (!user || buf.samples.length < MIN_SAMPLES_TO_FLUSH) return;

    const samples = [...buf.samples];
    buf.samples = [];

    const velocities = samples.map((s) => s.velocity);
    const pressures = samples.map((s) => s.pressure);
    const tiltsX = samples.map((s) => s.tilt_x);
    const tiltsY = samples.map((s) => s.tilt_y);

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const kineticVelocity = mean(velocities);
    const surfacePressure = mean(pressures);
    const tiltX = mean(tiltsX);
    const tiltY = mean(tiltsY);

    const payload = {
      pointer_events: samples,
      kinetic_velocity: kineticVelocity,
      surface_pressure: surfacePressure,
      tilt_x: tiltX,
      tilt_y: tiltY,
      event_count: samples.length,
      started_at: new Date(samples[0].ts).toISOString(),
      ended_at: new Date(samples[samples.length - 1].ts).toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('telemetry_sessions')
        .insert(payload)
        .select('id')
        .maybeSingle();

      if (error || !data) return;

      sessionIdRef.current = data.id;

      const velocityMean = kineticVelocity;
      const velocityArr = velocities;
      const velocityStddev =
        velocityArr.length > 1
          ? Math.sqrt(
              velocityArr.reduce((acc, v) => acc + (v - velocityMean) ** 2, 0) / velocityArr.length,
            )
          : 0;

      await supabase.from('phenotype_profiles').insert({
        session_id: data.id,
        velocity_mean: velocityMean,
        velocity_stddev: velocityStddev,
        pressure_mean: surfacePressure,
        tilt_x_mean: tiltX,
        tilt_y_mean: tiltY,
        profile_hash: computeHash(samples),
      });
    } catch {
      // Silent background capture — never surface errors to UI
    }
  }, [user]);

  const scheduleFlush = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushBuffer, DEBOUNCE_MS);
  }, [flushBuffer]);

  const handlePointerEvent = useCallback(
    (e: PointerEvent) => {
      const now = performance.now();
      const buf = bufferRef.current;

      const dt = now - buf.prev_ts;
      const dx = e.clientX - buf.prev_x;
      const dy = e.clientY - buf.prev_y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const velocity = dt > 0 ? dist / dt : 0;

      buf.samples.push({
        type: e.type,
        x: e.clientX,
        y: e.clientY,
        pressure: e.pressure,
        tilt_x: e.tiltX,
        tilt_y: e.tiltY,
        velocity,
        ts: Date.now(),
      });

      buf.prev_x = e.clientX;
      buf.prev_y = e.clientY;
      buf.prev_ts = now;

      scheduleFlush();
    },
    [scheduleFlush],
  );

  const transmit = useCallback(async (data: Record<string, unknown>) => {
    if (!user) return;
    try {
      await supabase.from('telemetry_sessions').insert(data);
    } catch {
      // Silent
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const events: (keyof DocumentEventMap)[] = ['pointermove', 'pointerdown', 'pointerup'];
    events.forEach((evt) =>
      document.addEventListener(evt, handlePointerEvent as EventListener, { passive: true }),
    );

    flushTimerRef.current = setInterval(flushBuffer, FLUSH_INTERVAL_MS);

    return () => {
      events.forEach((evt) =>
        document.removeEventListener(evt, handlePointerEvent as EventListener),
      );
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushBuffer();
    };
  }, [user, handlePointerEvent, flushBuffer]);

  return { transmit };
}
