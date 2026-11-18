import { createClient } from '@supabase/supabase-js';

// Raw 6-tuple: [x, y, timestamp_ms, pressure, tiltX, tiltY]
export type TelemetryTuple = [number, number, number, number, number, number];

export interface DiagnosticResult {
  jobId?: string;
  kinematics: {
    meanVelocity: number;
    peakAcceleration: number;
    jerkPhaseReversals: number;
    microTremorVariance: number;
    totalDurationMs: number;
    sampleCount: number;
  };
  diagnosis: {
    subtextSummary: string;
    cognitiveLoadIndex: number;
    autonomicState: string;
    congruenceScore: number;
    insights: string[];
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qnnnnvlissdqdwmkgrao.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class LightweightStrokeBuffer {
  private currentStroke: TelemetryTuple[] = [];
  private strokes: TelemetryTuple[][] = [];
  private flatSamples: TelemetryTuple[] = [];
  private isDrawing = false;

  public startStroke(e: PointerEvent, canvasRect: DOMRect): void {
    this.isDrawing = true;
    this.currentStroke = [];
    this.pushSample(e, canvasRect);
  }

  public recordMove(e: PointerEvent, canvasRect: DOMRect): void {
    if (!this.isDrawing) return;

    // Extract full 240Hz S-Pen hardware samples between frame ticks if supported
    const events = typeof e.getCoalescedEvents === 'function' 
      ? e.getCoalescedEvents() 
      : [e];

    for (let i = 0; i < events.length; i++) {
      this.pushSample(events[i], canvasRect);
    }
  }

  public endStroke(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentStroke.length > 0) {
      this.strokes.push(this.currentStroke);
      this.currentStroke = [];
    }
  }

  private pushSample(e: PointerEvent, rect: DOMRect): void {
    const tuple: TelemetryTuple = [
      Number((e.clientX - rect.left).toFixed(2)),
      Number((e.clientY - rect.top).toFixed(2)),
      Number(e.timeStamp.toFixed(3)),
      Number((e.pressure || 0.5).toFixed(4)),
      Number((e.tiltX || 0).toFixed(2)),
      Number((e.tiltY || 0).toFixed(2)),
    ];
    this.currentStroke.push(tuple);
    this.flatSamples.push(tuple);
  }

  public clear(): void {
    this.currentStroke = [];
    this.strokes = [];
    this.flatSamples = [];
    this.isDrawing = false;
  }

  public getSampleCount(): number {
    return this.flatSamples.length;
  }

  public async flushToCloud(subtextInput: string): Promise<DiagnosticResult> {
    if (this.flatSamples.length === 0) {
      throw new Error('Telemetry buffer is empty. Record at least one S-Pen stroke before flushing.');
    }

    const payload = {
      subtextInput: subtextInput.trim(),
      samples: this.flatSamples,
      strokes: this.strokes,
      clientMeta: {
        sampleCount: this.flatSamples.length,
        strokeCount: this.strokes.length,
        capturedAt: new Date().toISOString(),
      },
    };

    const { data, error } = await supabase.functions.invoke('process-telemetry', {
      body: payload,
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    this.clear();
    return data as DiagnosticResult;
  }
}
