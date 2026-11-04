"use client";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cloud,
  Download,
  Eraser,
  Heart,
  Pencil,
  Sparkles,
  Stamp,
  Star,
  Trash2,
} from "lucide-react";
import {
  SANRIO_CHARACTERS,
  SANRIO_CHARACTER_MAP,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";
import type {
  CanvasStamp,
  PartnerCursor,
  StampKind,
  StrokeSegment,
} from "@/lib/types";

export interface CoopCanvasHandle {
  drawRemoteSegment: (segment: StrokeSegment) => void;
  clearLocalPixels: () => void;
}

export interface CoopCanvasTabProps {
  canvasRefHandle: React.RefObject<CoopCanvasHandle | null>;
  stamps: CanvasStamp[];
  partnerCursor: PartnerCursor | null;
  onBroadcastStroke: (
    segment: Omit<StrokeSegment, "id" | "senderRole">
  ) => void;
  onPlaceStamp: (
    stamp: Omit<CanvasStamp, "id" | "senderRole" | "createdAt">
  ) => void;
  onClearCanvas: () => void;
  onBroadcastCursor: (x: number, y: number, color: string) => void;
}

const SANRIO_BRUSH_COLORS = [
  { name: "Charcoal Ink", hex: "#334155" },
  { name: "Cinnamoroll Sky", hex: "#7DD3FC" },
  { name: "My Melody Pink", hex: "#FDA4AF" },
  { name: "Kuromi Lavender", hex: "#C084FC" },
  { name: "Cloud Pastel", hex: "#BAE6FD" },
  { name: "Sweet Berry", hex: "#FB7185" },
];

const STROKE_SIZES = [
  { label: "S", width: 3 },
  { label: "M", width: 6 },
  { label: "L", width: 12 },
];

const STAMP_OPTIONS: Array<{ kind: StampKind; label: string }> = [
  ...SANRIO_CHARACTERS.map((c) => ({ kind: c.id as StampKind, label: c.name })),
  { kind: "heart", label: "Heart" },
  { kind: "star", label: "Star" },
  { kind: "ribbon", label: "Ribbon" },
];

function StampStickerGraphic({ kind }: { kind: StampKind }) {
  const mappedCharId: SanrioCharacterId | null =
    kind === "cloud"
      ? "cinnamoroll"
      : kind in SANRIO_CHARACTER_MAP
      ? (kind as SanrioCharacterId)
      : null;

  if (mappedCharId) {
    const meta = SANRIO_CHARACTER_MAP[mappedCharId];
    return (
      <motion.img
        src={meta.svgPath}
        alt={meta.name}
        draggable={false}
        animate={{ y: [0, -3.5, 0], scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        className="h-12 w-12 object-contain select-none pointer-events-none drop-shadow-sm"
      />
    );
  }

  switch (kind) {
    case "heart":
      return (
        <motion.svg
          animate={{ scale: [1, 1.14, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          width="38"
          height="38"
          viewBox="0 0 36 36"
          fill="none"
        >
          <path
            d="M18 31C18 31 5.5 22.8 5.5 13.5C5.5 8.9 9.2 5.5 13.5 5.5C16.1 5.5 17.4 6.8 18 8.2C18.6 6.8 19.9 5.5 22.5 5.5C26.8 5.5 30.5 8.9 30.5 13.5C30.5 22.8 18 31 18 31Z"
            fill="#FECDD3"
            stroke="#334155"
            strokeWidth="2.2"
          />
          <circle cx="13" cy="12" r="2" fill="#FFFFFF" />
        </motion.svg>
      );
    case "star":
      return (
        <motion.svg
          animate={{ rotate: [-6, 6, -6], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          width="38"
          height="38"
          viewBox="0 0 36 36"
          fill="none"
        >
          <path
            d="M18 4L21.9 12.6L31.2 13.7L24.3 20.1L26.1 29.3L18 24.7L9.9 29.3L11.7 20.1L4.8 13.7L14.1 12.6L18 4Z"
            fill="#FEF08A"
            stroke="#334155"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </motion.svg>
      );
    default:
      return (
        <motion.svg
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          width="40"
          height="34"
          viewBox="0 0 42 34"
          fill="none"
        >
          <ellipse
            cx="12"
            cy="17"
            rx="10"
            ry="7.5"
            fill="#FECDD3"
            stroke="#334155"
            strokeWidth="2.2"
          />
          <ellipse
            cx="30"
            cy="17"
            rx="10"
            ry="7.5"
            fill="#FECDD3"
            stroke="#334155"
            strokeWidth="2.2"
          />
          <circle
            cx="21"
            cy="17"
            r="5"
            fill="#BAE6FD"
            stroke="#334155"
            strokeWidth="2.2"
          />
        </motion.svg>
      );
  }
}

export function CoopCanvasTab({
  canvasRefHandle,
  stamps,
  partnerCursor,
  onBroadcastStroke,
  onPlaceStamp,
  onClearCanvas,
  onBroadcastCursor,
}: CoopCanvasTabProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesHistoryRef = useRef<
    Array<Omit<StrokeSegment, "id" | "senderRole">>
  >([]);

  const [toolMode, setToolMode] = useState<"brush" | "eraser" | "stamp">(
    "brush"
  );
  const [brushColor, setBrushColor] = useState<string>("#334155");
  const [strokeWidth, setStrokeWidth] = useState<number>(6);
  const [selectedStamp, setSelectedStamp] = useState<StampKind>("heart");
  const [showStampTray, setShowStampTray] = useState(false);

  const isDrawingRef = useRef(false);
  const activeStrokeIdRef = useRef("");
  const lastNormalizedPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastCursorSentRef = useRef<number>(0);

  const renderSegmentOnCanvas = useCallback(
    (seg: {
      prevX: number;
      prevY: number;
      x: number;
      y: number;
      color: string;
      strokeWidth: number;
      isEraser: boolean;
    }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x1 = seg.prevX * rect.width;
      const y1 = seg.prevY * rect.height;
      const x2 = seg.x * rect.width;
      const y2 = seg.y * rect.height;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = seg.isEraser ? seg.strokeWidth * 2.4 : seg.strokeWidth;

      if (seg.isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = seg.color;
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    },
    []
  );

  const resizeAndReplayCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Replay all recorded stroke segments so resize never loses drawings
    strokesHistoryRef.current.forEach((seg) => renderSegmentOnCanvas(seg));
  }, [renderSegmentOnCanvas]);

  useEffect(() => {
    resizeAndReplayCanvas();
    window.addEventListener("resize", resizeAndReplayCanvas);
    return () => window.removeEventListener("resize", resizeAndReplayCanvas);
  }, [resizeAndReplayCanvas]);

  // Expose remote drawing & clear handlers to parent hook
  useImperativeHandle(
    canvasRefHandle,
    () => ({
      drawRemoteSegment(segment: StrokeSegment) {
        strokesHistoryRef.current.push(segment);
        renderSegmentOnCanvas(segment);
      },
      clearLocalPixels() {
        strokesHistoryRef.current = [];
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
    }),
    [renderSegmentOnCanvas]
  );

  const getNormalizedCoords = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getNormalizedCoords(e);

    if (toolMode === "stamp") {
      onPlaceStamp({
        kind: selectedStamp,
        x: coords.x,
        y: coords.y,
        rotation: Math.round(Math.random() * 22 - 11),
      });
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    activeStrokeIdRef.current = `stk_${Date.now()}`;
    lastNormalizedPosRef.current = coords;

    // Draw initial dot
    const dotSeg = {
      strokeId: activeStrokeIdRef.current,
      prevX: coords.x,
      prevY: coords.y,
      x: coords.x + 0.0005,
      y: coords.y + 0.0005,
      color: brushColor,
      strokeWidth,
      isEraser: toolMode === "eraser",
    };
    strokesHistoryRef.current.push(dotSeg);
    renderSegmentOnCanvas(dotSeg);
    onBroadcastStroke(dotSeg);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getNormalizedCoords(e);
    const now = Date.now();
    if (now - lastCursorSentRef.current > 45) {
      lastCursorSentRef.current = now;
      onBroadcastCursor(coords.x, coords.y, brushColor);
    }

    if (!isDrawingRef.current || !lastNormalizedPosRef.current) return;

    const prev = lastNormalizedPosRef.current;
    const seg = {
      strokeId: activeStrokeIdRef.current,
      prevX: prev.x,
      prevY: prev.y,
      x: coords.x,
      y: coords.y,
      color: brushColor,
      strokeWidth,
      isEraser: toolMode === "eraser",
    };

    lastNormalizedPosRef.current = coords;
    strokesHistoryRef.current.push(seg);
    renderSegmentOnCanvas(seg);
    onBroadcastStroke(seg);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastNormalizedPosRef.current = null;
  };

  const handleClearAll = () => {
    strokesHistoryRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onClearCanvas();
  };

  const handleDownloadArtwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Subtle pastel dot pattern in exported image
    ctx.fillStyle = "#E2E8F0";
    for (let x = 20; x < exportCanvas.width; x += 28) {
      for (let y = 20; y < exportCanvas.height; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement("a");
    link.download = `cinnamelo-canvas-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  const isPartnerCursorRecent =
    partnerCursor && Date.now() - partnerCursor.updatedAt < 6000;

  return (
    <section className="relative flex flex-col h-[calc(100dvh-168px)] min-h-[500px] w-full rounded-3xl border border-pink-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-soft">
      {/* Top Minimalist Whiteboard Header Pill */}
      <div className="pointer-events-none absolute top-3.5 left-4 right-4 z-20 flex items-center justify-between">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-pink-100 dark:border-slate-800 px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
          <span>Co-op Sanrio Whiteboard</span>
          {toolMode === "stamp" && (
            <span className="rounded-full bg-[#E9D5FF]/60 dark:bg-purple-950 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
              Ketuk kanvas untuk menempel stiker
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleDownloadArtwork}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-200 hover:text-sky-600 shadow-sm transition-colors"
            title="Simpan gambar sebagai PNG"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-200 hover:text-rose-500 shadow-sm transition-colors"
            title="Bersihkan kanvas bersama"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Dotted Grid Whiteboard Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full sanrio-dotted-grid overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`block w-full h-full touch-none ${
            toolMode === "stamp" ? "cursor-copy" : "cursor-crosshair"
          }`}
        />

        {/* Animated Mini Stickers Layer (Synced via Supabase Realtime) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
          <AnimatePresence>
            {stamps.map((stamp) => (
              <motion.div
                key={stamp.id}
                initial={{ opacity: 0, scale: 0.2, rotate: stamp.rotation - 20 }}
                animate={{ opacity: 1, scale: 1, rotate: stamp.rotation }}
                exit={{ opacity: 0, scale: 0.2 }}
                transition={{ type: "spring", stiffness: 360, damping: 18 }}
                style={{
                  left: `${stamp.x * 100}%`,
                  top: `${stamp.y * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-sm"
              >
                <StampStickerGraphic kind={stamp.kind} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Live Partner Cursor Indicator */}
          {isPartnerCursorRecent && partnerCursor && (
            <motion.div
              animate={{
                left: `${partnerCursor.x * 100}%`,
                top: `${partnerCursor.y * 100}%`,
              }}
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="absolute -translate-x-1 -translate-y-1 flex items-center gap-1"
            >
              <span
                className="h-3 w-3 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: partnerCursor.color }}
              />
              <span className="rounded-full bg-[#334155]/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                {partnerCursor.name}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Stamp Picker Popover Tray (19 Sanrio Characters + Heart/Star/Ribbon) */}
      <AnimatePresence>
        {showStampTray && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md max-h-64 overflow-y-auto rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-pink-100 dark:border-slate-800 p-3.5 shadow-pill"
          >
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1E293B] dark:text-white">
                <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                <span>Pilih Stiker Sanrio ({STAMP_OPTIONS.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setShowStampTray(false)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-rose-500 transition-colors"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {STAMP_OPTIONS.map((opt) => {
                const active =
                  selectedStamp === opt.kind && toolMode === "stamp";
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => {
                      setSelectedStamp(opt.kind);
                      setToolMode("stamp");
                      setShowStampTray(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-medium transition-all ${
                      active
                        ? "bg-[#FECDD3]/45 dark:bg-pink-950/70 text-rose-600 dark:text-pink-300 ring-1 ring-pink-200 dark:ring-pink-800 font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="scale-75 -my-1.5">
                      <StampStickerGraphic kind={opt.kind} />
                    </div>
                    <span className="w-full truncate text-center leading-tight">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Minimalist Bottom Canvas Toolbar */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-lg rounded-3xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border border-pink-100 dark:border-slate-800 px-3 py-2.5 shadow-pill">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Pastel Color Swatches */}
          <div className="flex items-center gap-1.5">
            {SANRIO_BRUSH_COLORS.map((swatch) => {
              const isSelected =
                toolMode === "brush" && brushColor === swatch.hex;
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => {
                    setBrushColor(swatch.hex);
                    setToolMode("brush");
                    setShowStampTray(false);
                  }}
                  aria-label={swatch.name}
                  title={swatch.name}
                  className={`h-6 w-6 rounded-full border transition-transform ${
                    isSelected
                      ? "scale-115 ring-2 ring-offset-1 ring-sky-400 dark:ring-purple-400 border-white"
                      : "border-slate-200 dark:border-slate-700 hover:scale-105"
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                />
              );
            })}
          </div>

          <div className="h-5 w-px bg-slate-200/80 dark:bg-slate-700 hidden sm:block" />

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 rounded-full bg-[#F8FAFC] dark:bg-slate-800 p-0.5 border border-slate-100 dark:border-slate-700">
            {STROKE_SIZES.map((sz) => (
              <button
                key={sz.label}
                type="button"
                onClick={() => setStrokeWidth(sz.width)}
                className={`h-6 w-6 rounded-full text-[10px] font-bold transition-all ${
                  strokeWidth === sz.width
                    ? "bg-[#1E293B] dark:bg-purple-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>

          {/* Tool Mode Buttons: Brush, Eraser, Stamp */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setToolMode("brush");
                setShowStampTray(false);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                toolMode === "brush"
                  ? "bg-[#BAE6FD]/70 dark:bg-sky-900 text-[#1E293B] dark:text-white font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Kuas Gambar"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setToolMode("eraser");
                setShowStampTray(false);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                toolMode === "eraser"
                  ? "bg-[#FECDD3]/70 dark:bg-pink-900 text-rose-600 dark:text-pink-300 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Penghapus"
            >
              <Eraser className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const nextTray = !showStampTray;
                setShowStampTray(nextTray);
                setToolMode("stamp");
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-xs font-semibold transition-colors ${
                toolMode === "stamp"
                  ? "bg-[#E9D5FF]/80 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 ring-1 ring-purple-300 dark:ring-purple-700"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Stiker Sanrio Animasi"
            >
              <Stamp className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Stiker</span>
              {selectedStamp in SANRIO_CHARACTER_MAP && (
                <img
                  src={
                    SANRIO_CHARACTER_MAP[selectedStamp as SanrioCharacterId]
                      .svgPath
                  }
                  alt=""
                  className="h-4 w-4 object-contain"
                />
              )}
              {selectedStamp === "heart" && (
                <Heart className="h-3 w-3 text-rose-400" />
              )}
              {selectedStamp === "star" && (
                <Star className="h-3 w-3 text-amber-400" />
              )}
              {selectedStamp === "cloud" && (
                <Cloud className="h-3 w-3 text-sky-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
