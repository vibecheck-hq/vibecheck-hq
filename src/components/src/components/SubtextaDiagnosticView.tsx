import React, { useRef, useState, useEffect } from 'react';
import { LightweightStrokeBuffer, DiagnosticResult } from '../lib/telemetryClient';

export const SubtextaDiagnosticView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferRef = useRef<LightweightStrokeBuffer>(new LightweightStrokeBuffer());
  const rectRef = useRef<DOMRect | null>(null);

  const [subtextInput, setSubtextInput] = useState('');
  const [sampleCount, setSampleCount] = useState(0);
  const [penOnlyMode, setPenOnlyMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    rectRef.current = rect;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && e.pointerType === 'touch') return; // Hardware palm rejection
    e.currentTarget.setPointerCapture(e.pointerId);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    rectRef.current = rect;

    bufferRef.current.startStroke(e.nativeEvent, rect);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && e.pointerType === 'touch') return;
    if (e.buttons !== 1) return;

    const canvas = canvasRef.current;
    const rect = rectRef.current;
    if (!canvas || !rect) return;

    bufferRef.current.recordMove(e.nativeEvent, rect);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = Math.max(1.5, (e.pressure || 0.5) * 4.5);
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && e.pointerType === 'touch') return;
    bufferRef.current.endStroke();
    setSampleCount(bufferRef.current.getSampleCount());
  };

  const handleClearCanvas = () => {
    bufferRef.current.clear();
    setSampleCount(0);
    setResult(null);
    setErrorMsg(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const diagnostics = await bufferRef.current.flushToCloud(subtextInput);
      setResult(diagnostics);
      setSampleCount(0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to flush telemetry to cloud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-wide text-cyan-400">
              VIBEX MINDPAPER // SUBTEXTA
            </h1>
            <p className="text-xs text-slate-400">
              Zero-Compute S-Pen Telemetry Capture &amp; 3rd-Order Kinematic Cloud Offload
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPenOnlyMode(!penOnlyMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              penOnlyMode
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {penOnlyMode ? 'S-Pen Lock: ON (Palm Rejected)' : 'All Touch Input: ON'}
          </button>
        </div>

        {/* Subtext Context Input */}
        <div className="bg-[#0B0F10]/90 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md">
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
            Verbal / Written Subtext Prompt
          </label>
          <textarea
            value={subtextInput}
            onChange={(e) => setSubtextInput(e.target.value)}
            placeholder="Enter message context or prompt before writing on the Mindpaper canvas..."
            rows={2}
            className="w-full bg-[#0A0F1D] border border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* High-Frequency S-Pen Canvas */}
        <div className="relative bg-[#0B0F10] border border-cyan-500/30 rounded-xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/70 border-b border-slate-800 text-xs text-slate-400">
            <span>6-Tuple Buffer: [x, y, t, pressure, tiltX, tiltY]</span>
            <span className="text-teal-400 font-mono">{sampleCount} samples buffered</span>
          </div>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'none' }}
            className="w-full h-72 cursor-crosshair block"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClearCanvas}
            className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/80 text-xs font-medium text-slate-300 hover:border-slate-500"
          >
            Clear Buffer
          </button>
          <button
            type="button"
            disabled={isSubmitting || sampleCount === 0}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-semibold text-xs tracking-wide disabled:opacity-40"
          >
            {isSubmitting ? 'Flushing to Edge Function...' : 'Flush Telemetry & Decode'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Server-Side Diagnostic Readout */}
        {result && (
          <div className="bg-[#0B0F10]/90 border border-teal-500/30 rounded-xl p-5 space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">
                3rd-Order Kinematic &amp; Subtext Telemetry Report
              </h2>
              <span className="text-xs font-mono text-slate-400">
                {result.kinematics?.sampleCount} pts // {result.kinematics?.totalDurationMs} ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#0A0F1D] border border-slate-800">
                <div className="text-[11px] text-slate-400">Mean Velocity</div>
                <div className="text-lg font-mono text-cyan-400">
                  {result.kinematics?.meanVelocity?.toFixed(2)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0F1D] border border-slate-800">
                <div className="text-[11px] text-slate-400">Peak Accel</div>
                <div className="text-lg font-mono text-cyan-400">
                  {result.kinematics?.peakAcceleration?.toFixed(2)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0F1D] border border-slate-800">
                <div className="text-[11px] text-slate-400">Jerk Reversals</div>
                <div className="text-lg font-mono text-teal-400">
                  {result.kinematics?.jerkPhaseReversals}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0F1D] border border-slate-800">
                <div className="text-[11px] text-slate-400">Micro-Tremor Var</div>
                <div className="text-lg font-mono text-teal-400">
                  {result.kinematics?.microTremorVariance?.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#0A0F1D] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Autonomic State: <strong className="text-slate-100">{result.diagnosis?.autonomicState}</strong>
                </span>
                <span className="text-cyan-400 font-mono">
                  Congruence: {result.diagnosis?.congruenceScore}%
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {result.diagnosis?.subtextSummary}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
