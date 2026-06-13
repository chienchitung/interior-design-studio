import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Ruler, Trash2, ArrowRight, DoorOpen, MousePointer2, X, Plus, GitBranch } from 'lucide-react';
import { EmptySpaceLayout, EmptySpaceOpening, EmptySpaceWall } from '../types';

type FilterMode = null | 'walls' | 'openings';
type PixelState = { x1: number; y1: number; x2: number; y2: number; controlPoints?: { x: number; y: number }[] };
type WallDrag = {
  wallId: string;
  mode: 'start' | 'end' | { type: 'control'; index: number };
  startClientX: number;
  startClientY: number;
  origPx: PixelState;
} | null;

interface FloorPlanAnalysisWorkbenchProps {
  floorPlan: File;
  layout: EmptySpaceLayout;
  isAnalyzing: boolean;
  isAIDetectingDoors?: boolean;
  onCalibrateScale: (wallId: string, actualLengthCm: number) => void;
  onRemoveWall: (wallId: string) => void;
  onRemoveOpening?: (openingId: string) => void;
  onAddOpening?: (opening: Omit<EmptySpaceOpening, 'id'>) => void;
  onAIDetectOpenings?: () => Promise<void>;
  onUpdateWall?: (wallId: string, pixel: PixelState) => void;
  onReanalyze: () => void;
  onConfirmLayout?: () => void;
}

const getWallLengthCm = (wall: EmptySpaceWall) => Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);

export const FloorPlanAnalysisWorkbench: React.FC<FloorPlanAnalysisWorkbenchProps> = ({
  floorPlan,
  layout,
  isAnalyzing,
  isAIDetectingDoors,
  onCalibrateScale,
  onRemoveWall,
  onRemoveOpening,
  onAddOpening,
  onUpdateWall,
  onReanalyze,
  onConfirmLayout,
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [selectedWallId, setSelectedWallId] = useState(layout.walls[0]?.id ?? '');
  const [selectedOpeningId, setSelectedOpeningId] = useState('');
  const [knownLengthCm, setKnownLengthCm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>(null);
  // dragRef / livePixelRef are synchronous refs so event handlers read the latest value
  // without waiting for a React re-render (avoids stale-closure drag bug).
  const dragRef = useRef<WallDrag>(null);
  const livePixelRef = useRef<PixelState | null>(null);
  const [dragState, setDragState] = useState<WallDrag>(null);   // for cursor class + getWallPx
  const [livePixel, setLivePixel] = useState<PixelState | null>(null);  // for visual feedback

  const [addMode, setAddMode] = useState(false);
  const [svgScale, setSvgScale] = useState(1);
  const [pendingPx, setPendingPx] = useState<{ x: number; y: number } | null>(null);
  const [pendingWidth, setPendingWidth] = useState('90');
  const [pendingOrientation, setPendingOrientation] = useState<'H' | 'V'>('H');

  useEffect(() => {
    const url = URL.createObjectURL(floorPlan);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [floorPlan]);

  useEffect(() => {
    if (selectedWallId !== '' && !layout.walls.some(w => w.id === selectedWallId)) {
      setSelectedWallId(layout.walls[0]?.id ?? '');
    }
  }, [layout.walls, selectedWallId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pendingPx) { setPendingPx(null); return; }
      if (addMode) { setAddMode(false); return; }
      if (filterMode) setFilterMode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addMode, pendingPx, filterMode]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const srcW = Math.max(1, layout.sourceImage.widthPx);
    const update = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0) setSvgScale(rect.width / srcW);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [layout.sourceImage.widthPx]);

  const selectedWall = useMemo(() => layout.walls.find(w => w.id === selectedWallId) ?? null, [layout.walls, selectedWallId]);
  const selectedOpening = useMemo(() => layout.openings.find(op => op.id === selectedOpeningId) ?? null, [layout.openings, selectedOpeningId]);
  const selectedWallLength = selectedWall ? getWallLengthCm(selectedWall) : 0;
  const actualLength = Number(knownLengthCm);
  const canCalibrate = Boolean(selectedWall && Number.isFinite(actualLength) && actualLength > 0);
  const drawingWidth = Math.max(1, layout.sourceImage.widthPx);
  const drawingHeight = Math.max(1, layout.sourceImage.heightPx);

  const openingPixels = useMemo(() => {
    const { drawingBoundsPx } = layout.sourceImage;
    const cx = (drawingBoundsPx.minX + drawingBoundsPx.maxX) / 2;
    const cy = (drawingBoundsPx.minY + drawingBoundsPx.maxY) / 2;
    const cpp = layout.scale.cmPerPixel;
    return layout.openings.map(op => {
      const px = cx + op.x / cpp;
      const py = cy + op.y / cpp;
      const hw = (op.widthCm / 2) / cpp;
      const isH = Math.abs(op.rotation) < 0.1;
      return {
        id: op.id,
        cx: px, cy: py,
        x1: isH ? px - hw : px, y1: isH ? py : py - hw,
        x2: isH ? px + hw : px, y2: isH ? py : py + hw,
        hitW: Math.max(16, hw * 2 + 8),
      };
    });
  }, [layout.openings, layout.sourceImage, layout.scale.cmPerPixel]);

  // Wall visual: one colour (cyan) for all walls; yellow when selected; dim when in opening mode
  const getWallStyle = (wall: EmptySpaceWall) => {
    const selected = wall.id === selectedWallId;
    const baseSw = Math.max(3, Math.min(12, wall.pixel?.thicknessPx ?? 4));
    if (selected) return { stroke: '#facc15', opacity: 0.97, sw: baseSw + 1 };
    if (filterMode === 'openings') return { stroke: '#22d3ee', opacity: 0.18, sw: baseSw };
    return { stroke: '#22d3ee', opacity: filterMode === 'walls' ? 0.92 : 0.65, sw: baseSw };
  };

  // Opening visual: green when normal; orange when selected; dim in wall mode
  const getOpeningStyle = (opId: string) => {
    const selected = opId === selectedOpeningId;
    if (selected) return { color: '#f97316', opacity: 1.0, dashed: false };
    if (filterMode === 'walls') return { color: '#4ade80', opacity: 0.18, dashed: true };
    return { color: '#4ade80', opacity: filterMode === 'openings' ? 1.0 : 0.82, dashed: true };
  };

  const toggleFilter = (mode: Exclude<FilterMode, null>) =>
    setFilterMode(prev => (prev === mode ? null : mode));

  // Build the pixel state for a wall (includes live drag overrides).
  // Uses livePixel (React state) so the visual re-renders when it changes.
  const getWallPx = (wall: EmptySpaceWall): PixelState =>
    (dragState?.wallId === wall.id && livePixel) ? livePixel
    : (dragRef.current?.wallId === wall.id && livePixelRef.current) ? livePixelRef.current
    : (wall.pixel ?? { x1: 0, y1: 0, x2: 0, y2: 0, thicknessPx: 4 });

  const getOrigPx = (wall: EmptySpaceWall): PixelState => ({
    ...(wall.pixel ?? { x1: 0, y1: 0, x2: 0, y2: 0, thicknessPx: 4 }),
    controlPoints: wall.pixel?.controlPoints ? [...wall.pixel.controlPoints] : undefined,
  });

  // Attach drag listeners to document so fast mouse movements outside the SVG don't drop the drag.
  const startDrag = (drag: WallDrag) => {
    dragRef.current = drag;
    livePixelRef.current = drag!.origPx;
    setDragState(drag);
    setLivePixel(drag!.origPx);

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !svgRef.current) return;
      const ctm = svgRef.current.getScreenCTM();
      if (!ctm) return;
      const dx = (e.clientX - d.startClientX) / ctm.a;
      const dy = (e.clientY - d.startClientY) / ctm.d;
      const { origPx, mode } = d;
      let next: PixelState;
      if (mode === 'start') {
        next = { ...origPx, x1: origPx.x1 + dx, y1: origPx.y1 + dy };
      } else if (mode === 'end') {
        next = { ...origPx, x2: origPx.x2 + dx, y2: origPx.y2 + dy };
      } else {
        const cps = [...(origPx.controlPoints ?? [])];
        cps[mode.index] = { x: cps[mode.index].x + dx, y: cps[mode.index].y + dy };
        next = { ...origPx, controlPoints: cps };
      }
      livePixelRef.current = next;
      setLivePixel(next);
    };

    const onUp = () => {
      const d = dragRef.current;
      const live = livePixelRef.current;
      if (d && live && onUpdateWall) onUpdateWall(d.wallId, live);
      dragRef.current = null;
      livePixelRef.current = null;
      setDragState(null);
      setLivePixel(null);
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleEndpointMouseDown = (e: React.MouseEvent, wallId: string, endpoint: 'start' | 'end') => {
    e.stopPropagation(); e.preventDefault();
    const wall = layout.walls.find(w => w.id === wallId);
    if (!wall?.pixel) return;
    startDrag({ wallId, mode: endpoint, startClientX: e.clientX, startClientY: e.clientY, origPx: getOrigPx(wall) });
  };

  const handleControlPointMouseDown = (e: React.MouseEvent, wallId: string, index: number) => {
    e.stopPropagation(); e.preventDefault();
    const wall = layout.walls.find(w => w.id === wallId);
    if (!wall?.pixel) return;
    startDrag({ wallId, mode: { type: 'control', index }, startClientX: e.clientX, startClientY: e.clientY, origPx: getOrigPx(wall) });
  };

  // Add a bend point at the midpoint of the selected wall
  const handleAddControlPoint = () => {
    if (!selectedWall?.pixel || !onUpdateWall) return;
    const px = getWallPx(selectedWall);
    const cps = px.controlPoints ?? [];
    const midX = (px.x1 + px.x2) / 2;
    const midY = (px.y1 + px.y2) / 2;
    // Insert at center of the polyline
    const insertAt = Math.floor(cps.length / 2);
    const newCps = [...cps.slice(0, insertAt), { x: midX, y: midY }, ...cps.slice(insertAt)];
    onUpdateWall(selectedWall.id, { ...px, controlPoints: newCps });
  };

  const handleRemoveControlPoints = () => {
    if (!selectedWall?.pixel || !onUpdateWall) return;
    const px = getWallPx(selectedWall);
    onUpdateWall(selectedWall.id, { ...px, controlPoints: undefined });
  };

  // Build SVG path for a wall (with or without control points)
  const getWallSvgPath = (px: PixelState): string | null => {
    const { x1, y1, x2, y2, controlPoints: cps } = px;
    if (!cps || cps.length === 0) return null;
    if (cps.length === 1) return `M ${x1} ${y1} Q ${cps[0].x} ${cps[0].y} ${x2} ${y2}`;
    return `M ${x1} ${y1} ${cps.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${x2} ${y2}`;
  };

  const detectNearestOrientation = (pixelX: number, pixelY: number): 'H' | 'V' => {
    const { drawingBoundsPx } = layout.sourceImage;
    const cx = (drawingBoundsPx.minX + drawingBoundsPx.maxX) / 2;
    const cy = (drawingBoundsPx.minY + drawingBoundsPx.maxY) / 2;
    const cpp = layout.scale.cmPerPixel;
    const clickX = (pixelX - cx) * cpp;
    const clickY = (pixelY - cy) * cpp;
    let minH = Infinity, minV = Infinity;
    for (const wall of layout.walls) {
      const isH = Math.abs(wall.y2 - wall.y1) < Math.abs(wall.x2 - wall.x1);
      const xMin = Math.min(wall.x1, wall.x2), xMax = Math.max(wall.x1, wall.x2);
      const yMin = Math.min(wall.y1, wall.y2), yMax = Math.max(wall.y1, wall.y2);
      if (isH && clickX >= xMin - 50 && clickX <= xMax + 50) minH = Math.min(minH, Math.abs(clickY - wall.y1));
      if (!isH && clickY >= yMin - 50 && clickY <= yMax + 50) minV = Math.min(minV, Math.abs(clickX - wall.x1));
    }
    return minH <= minV ? 'H' : 'V';
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!addMode || dragState) return;
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());
    setPendingPx({ x: svgPt.x, y: svgPt.y });
    setPendingOrientation(detectNearestOrientation(svgPt.x, svgPt.y));
    setSelectedWallId('');
    setSelectedOpeningId('');
  };

  const handleConfirmAddOpening = () => {
    if (!pendingPx || !onAddOpening) return;
    const { drawingBoundsPx } = layout.sourceImage;
    const cx = (drawingBoundsPx.minX + drawingBoundsPx.maxX) / 2;
    const cy = (drawingBoundsPx.minY + drawingBoundsPx.maxY) / 2;
    const cpp = layout.scale.cmPerPixel;
    onAddOpening({
      type: 'door',
      x: (pendingPx.x - cx) * cpp,
      y: (pendingPx.y - cy) * cpp,
      widthCm: Math.max(50, Math.min(200, Number(pendingWidth) || 90)),
      rotation: pendingOrientation === 'V' ? Math.PI / 2 : 0,
      confidence: 1,
    });
    setPendingPx(null);
    setPendingWidth('90');
    setAddMode(false);
  };

  const handleCalibrate = () => {
    if (!selectedWall || !canCalibrate) return;
    onCalibrateScale(selectedWall.id, actualLength);
    setKnownLengthCm('');
    inputRef.current?.blur();
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">

      {/* ── Floor plan panel ── */}
      <div className="relative min-h-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">

        {/* Badge bar */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-sm shadow-black/60 backdrop-blur-sm ${
            layout.scale.confidence === 'calibrated'
              ? 'border-emerald-500/50 bg-emerald-900/80 text-emerald-200'
              : 'border-amber-500/50 bg-amber-900/80 text-amber-200'
          }`}>
            {layout.scale.confidence === 'calibrated' ? '比例已校正' : '比例待校正'}
          </span>

          <button
            onClick={() => toggleFilter('walls')}
            title="點擊高亮所有牆線"
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-sm shadow-black/60 backdrop-blur-sm transition-colors ${
              filterMode === 'walls'
                ? 'border-cyan-400/70 bg-cyan-800/90 text-cyan-100 ring-1 ring-cyan-400/40'
                : 'border-cyan-500/50 bg-neutral-900/90 text-cyan-300 hover:bg-neutral-800/90'
            }`}
          >
            牆線 {layout.walls.length}
          </button>

          {layout.openings.length > 0 && (
            <button
              onClick={() => toggleFilter('openings')}
              title="點擊高亮所有開口"
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-sm shadow-black/60 backdrop-blur-sm transition-colors ${
                filterMode === 'openings'
                  ? 'border-emerald-400/70 bg-emerald-800/90 text-emerald-100 ring-1 ring-emerald-400/40'
                  : 'border-emerald-500/50 bg-emerald-900/80 text-emerald-200 hover:bg-emerald-800/80'
              }`}
            >
              開口 {layout.openings.length}
            </button>
          )}

          {isAIDetectingDoors && (
            <span className="flex items-center gap-1 rounded-full border border-indigo-500/50 bg-indigo-900/80 px-2.5 py-1 text-[10px] font-bold text-indigo-200 shadow-sm shadow-black/60 backdrop-blur-sm">
              <RefreshCw size={9} className="animate-spin" />
              AI 偵測中
            </span>
          )}
        </div>

        {/* Floor plan image + SVG overlay */}
        <div className="flex h-full w-full items-center justify-center p-3">
          <div className="relative max-h-full max-w-full overflow-hidden rounded-lg border border-neutral-800 bg-white shadow-2xl shadow-black/40">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="平面圖"
                className="block max-h-[calc(100vh-200px)] w-auto max-w-full select-none object-contain"
                draggable={false}
              />
            )}
            <svg
              ref={svgRef}
              className={`absolute inset-0 h-full w-full ${addMode ? 'cursor-crosshair' : ''}`}
              viewBox={`0 0 ${drawingWidth} ${drawingHeight}`}
              preserveAspectRatio="xMidYMid meet"
              onClick={handleSvgClick}
            >
              {/* Walls */}
              {layout.walls.map(wall => {
                if (!wall.pixel) return null;
                const px = getWallPx(wall);
                const { stroke, opacity, sw } = getWallStyle(wall);
                const selected = wall.id === selectedWallId;
                const svgPath = getWallSvgPath(px);
                const hitSw = Math.max(18, (wall.pixel.thicknessPx ?? 4) + 12);
                const clickHandler = addMode ? undefined : (e: React.MouseEvent) => { e.stopPropagation(); setSelectedWallId(wall.id); setSelectedOpeningId(''); };
                return (
                  <g key={wall.id}>
                    {/* Hit area */}
                    {svgPath
                      ? <path d={svgPath} stroke="transparent" strokeWidth={hitSw} fill="none" strokeLinecap="round"
                          className={addMode || dragState ? undefined : 'cursor-pointer'} onClick={clickHandler} />
                      : <line x1={px.x1} y1={px.y1} x2={px.x2} y2={px.y2} stroke="transparent" strokeWidth={hitSw}
                          strokeLinecap="round" className={addMode || dragState ? undefined : 'cursor-pointer'} onClick={clickHandler} />
                    }
                    {/* Visible wall */}
                    {svgPath
                      ? <path d={svgPath} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round"
                          opacity={opacity} pointerEvents="none" />
                      : <line x1={px.x1} y1={px.y1} x2={px.x2} y2={px.y2} stroke={stroke} strokeWidth={sw}
                          strokeLinecap="round" opacity={opacity} pointerEvents="none" />
                    }
                    {/* Endpoint drag handles */}
                    {selected && !addMode && onUpdateWall && (() => {
                      const hitR = Math.min(40, Math.max(8, 14 / svgScale));
                      const visR = Math.min(16, Math.max(4, 6 / svgScale));
                      const sw = Math.min(3, Math.max(0.5, 1.5 / svgScale));
                      return (
                        <>
                          <circle cx={px.x1} cy={px.y1} r={hitR} fill="transparent"
                            className="cursor-grab" onMouseDown={e => handleEndpointMouseDown(e, wall.id, 'start')} />
                          <circle cx={px.x1} cy={px.y1} r={visR} fill="#facc15" stroke="#000" strokeWidth={sw} pointerEvents="none" />
                          <circle cx={px.x2} cy={px.y2} r={hitR} fill="transparent"
                            className="cursor-grab" onMouseDown={e => handleEndpointMouseDown(e, wall.id, 'end')} />
                          <circle cx={px.x2} cy={px.y2} r={visR} fill="#facc15" stroke="#000" strokeWidth={sw} pointerEvents="none" />
                          {/* Control point handles */}
                          {px.controlPoints?.map((cp, ci) => (
                            <g key={ci}>
                              <line x1={ci === 0 ? px.x1 : (px.controlPoints![ci - 1]?.x ?? px.x1)}
                                    y1={ci === 0 ? px.y1 : (px.controlPoints![ci - 1]?.y ?? px.y1)}
                                    x2={cp.x} y2={cp.y}
                                    stroke="#a855f7" strokeWidth={Math.max(0.5, 1 / svgScale)} strokeDasharray="3 2" opacity={0.5} pointerEvents="none" />
                              <circle cx={cp.x} cy={cp.y} r={hitR} fill="transparent"
                                className="cursor-grab" onMouseDown={e => handleControlPointMouseDown(e, wall.id, ci)} />
                              <circle cx={cp.x} cy={cp.y} r={Math.min(14, Math.max(3, 5 / svgScale))} fill="#a855f7" stroke="#000" strokeWidth={sw} pointerEvents="none" />
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Openings */}
              {openingPixels.map(op => {
                const { color, opacity, dashed } = getOpeningStyle(op.id);
                const selected = op.id === selectedOpeningId;
                return (
                  <g key={op.id}>
                    <line
                      x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2}
                      stroke="transparent" strokeWidth={op.hitW} strokeLinecap="round"
                      className={addMode ? undefined : 'cursor-pointer'}
                      onClick={addMode ? undefined : e => { e.stopPropagation(); setSelectedOpeningId(selected ? '' : op.id); setSelectedWallId(''); }}
                    />
                    <line
                      x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2}
                      stroke={color} strokeWidth={Math.max(0.5, (selected ? 3 : 2) / svgScale)} strokeLinecap="round"
                      strokeDasharray={dashed ? `${5 / svgScale} ${3 / svgScale}` : undefined}
                      opacity={opacity} pointerEvents="none"
                    />
                    <circle cx={op.cx} cy={op.cy} r={Math.min(12, Math.max(2, (selected ? 5 : 3.5) / svgScale))} fill={color} opacity={opacity} pointerEvents="none" />
                  </g>
                );
              })}

              {/* Pending add-opening marker */}
              {pendingPx && (
                <g pointerEvents="none">
                  <circle cx={pendingPx.x} cy={pendingPx.y} r={10}
                    fill="none" stroke="#e2e8f0" strokeWidth={2.5} strokeDasharray="4 3" opacity={0.9} />
                  {pendingOrientation === 'H'
                    ? <line x1={pendingPx.x - 12} y1={pendingPx.y} x2={pendingPx.x + 12} y2={pendingPx.y} stroke="#e2e8f0" strokeWidth={3} strokeLinecap="round" />
                    : <line x1={pendingPx.x} y1={pendingPx.y - 12} x2={pendingPx.x} y2={pendingPx.y + 12} stroke="#e2e8f0" strokeWidth={3} strokeLinecap="round" />
                  }
                </g>
              )}
            </svg>

            {/* Legend */}
            <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-lg border border-neutral-700/60 bg-neutral-900/90 px-2.5 py-2 text-[9px] leading-5 backdrop-blur-sm shadow-sm shadow-black/40">
              <div className="mb-0.5 font-bold text-neutral-400">圖例</div>
              <div className="flex items-center gap-1.5 text-neutral-300"><span className="inline-block h-0.5 w-4 rounded-full bg-cyan-400" />牆線</div>
              <div className="flex items-center gap-1.5 text-neutral-300"><span className="inline-block h-0.5 w-4 rounded-full bg-yellow-400" />已選取端點</div>
              <div className="flex items-center gap-1.5 text-neutral-300"><span className="inline-block h-2 w-2 rounded-full bg-violet-500" />彎折點</div>
              <div className="flex items-center gap-1.5 text-neutral-300"><span className="inline-block h-px w-4 border-t-2 border-dashed border-emerald-400" />開口</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className="flex min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-950/90">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-neutral-800 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">解析工作台</p>
            <p className="truncate text-[11px] text-neutral-500">{layout.imageName}</p>
          </div>
          <button
            onClick={onReanalyze}
            disabled={isAnalyzing}
            className="rounded-lg border border-neutral-800 p-2 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white disabled:opacity-50"
            title="重新解析"
          >
            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">

          {/* Scale calibration */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-neutral-200">
              <Ruler size={14} className="text-cyan-300" />比例校正
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
              <span>目前選取</span>
              <span className="font-mono text-neutral-300">{selectedWall?.id ?? '—'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
              <span>估算長度</span>
              <span className="font-mono text-neutral-300">{selectedWallLength ? `${Math.round(selectedWallLength)} cm` : '—'}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                ref={inputRef}
                type="number" min="1" step="any"
                value={knownLengthCm}
                onChange={e => setKnownLengthCm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCalibrate()}
                placeholder="實際 cm"
                className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-cyan-500/70 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={handleCalibrate}
                disabled={!canCalibrate}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500"
              >套用</button>
            </div>
          </div>

          {/* Wall operations */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
            <p className="mb-2 text-xs font-bold text-neutral-200">牆線操作</p>
            {selectedWall && onUpdateWall && (
              <p className="mb-2 text-center text-[10px] text-neutral-500">拖曳黃點調整端點，拖曳紫點調整彎折</p>
            )}
            {/* Bend point controls */}
            {selectedWall && onUpdateWall && (
              <div className="mb-2 flex gap-1.5">
                <button
                  onClick={handleAddControlPoint}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 px-2 py-1.5 text-[11px] font-bold text-violet-300 transition-colors hover:border-violet-400/40 hover:bg-violet-500/15"
                  title="在中間加入彎折點"
                >
                  <GitBranch size={11} />加入彎折
                </button>
                {(selectedWall.pixel?.controlPoints?.length ?? 0) > 0 && (
                  <button
                    onClick={handleRemoveControlPoints}
                    className="flex items-center justify-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-[11px] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white"
                    title="移除所有彎折點，恢復直線"
                  >
                    <X size={11} />拉直
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => selectedWall && onRemoveWall(selectedWall.id)}
              disabled={!selectedWall}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-500/15 disabled:opacity-40"
            >
              <Trash2 size={13} />刪除選取牆線
            </button>
          </div>

          {/* Opening management */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                <DoorOpen size={13} className="text-emerald-400" />開口管理
              </div>
              {isAIDetectingDoors && (
                <span className="flex items-center gap-1 text-[10px] text-indigo-400">
                  <RefreshCw size={10} className="animate-spin" />AI 偵測中
                </span>
              )}
            </div>

            {/* Manual mark toggle */}
            <button
              onClick={() => addMode ? (setAddMode(false), setPendingPx(null)) : setAddMode(true)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors ${
                addMode
                  ? 'border-amber-400/40 bg-amber-500/12 text-amber-300 hover:border-amber-400/60'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-white'
              }`}
            >
              {addMode ? <X size={12} /> : <MousePointer2 size={12} />}
              {addMode ? '退出標記模式' : '手動加入門口'}
            </button>

            {addMode && !pendingPx && (
              <p className="mt-2 text-center text-[10px] leading-relaxed text-neutral-500">
                點選平面圖上的門口位置<br />
                <span className="text-amber-400/60">Esc 可退出</span>
              </p>
            )}

            {addMode && pendingPx && (
              <div className="mt-2.5 space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-amber-300/90">設定開口資訊</p>
                  <button onClick={() => setPendingPx(null)} className="text-neutral-500 hover:text-white"><X size={11} /></button>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setPendingOrientation('H')}
                    className={`flex-1 rounded py-1 text-[10px] font-bold transition-colors ${pendingOrientation === 'H' ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-500 hover:text-white'}`}>
                    水平牆
                  </button>
                  <button onClick={() => setPendingOrientation('V')}
                    className={`flex-1 rounded py-1 text-[10px] font-bold transition-colors ${pendingOrientation === 'V' ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-500 hover:text-white'}`}>
                    垂直牆
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min="50" max="200" step="5"
                    value={pendingWidth}
                    onChange={e => setPendingWidth(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConfirmAddOpening()}
                    placeholder="寬度"
                    className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-[11px] text-white outline-none focus:border-amber-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] text-neutral-500">cm</span>
                  <button
                    onClick={handleConfirmAddOpening}
                    disabled={!onAddOpening}
                    className="flex items-center gap-1 rounded bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
                  >
                    <Plus size={11} />加入
                  </button>
                </div>
              </div>
            )}

            {/* Delete selected opening */}
            {layout.openings.length > 0 && (
              <div className="mt-2">
                {selectedOpening ? (
                  <button
                    onClick={() => { onRemoveOpening?.(selectedOpening.id); setSelectedOpeningId(''); }}
                    disabled={!onRemoveOpening}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-500/15 disabled:opacity-40"
                  >
                    <Trash2 size={13} />刪除選取開口
                  </button>
                ) : (
                  <p className="text-center text-[10px] text-neutral-500">
                    點選圖上<span className="text-emerald-400">綠色標記</span>可選取開口
                  </p>
                )}
              </div>
            )}
          </div>

        </div>{/* end scrollable body */}

        {/* Confirm footer */}
        {onConfirmLayout && (
          <div className="flex-shrink-0 border-t border-neutral-800 p-3">
            {layout.scale.confidence !== 'calibrated' && (
              <p className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-300/80">
                比例尚未校正，3D 家具尺寸可能不準確。
              </p>
            )}
            <button
              onClick={onConfirmLayout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-black transition-colors hover:bg-neutral-200 active:scale-[0.98]"
            >
              確認格局，開始配置家具
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
