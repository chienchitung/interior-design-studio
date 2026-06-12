import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, RefreshCw, Ruler, Trash2 } from 'lucide-react';
import { EmptySpaceIssue, EmptySpaceLayout, EmptySpaceWall } from '../types';

interface FloorPlanAnalysisWorkbenchProps {
  floorPlan: File;
  layout: EmptySpaceLayout;
  isAnalyzing: boolean;
  onCalibrateScale: (wallId: string, actualLengthCm: number) => void;
  onRemoveWall: (wallId: string) => void;
  onReanalyze: () => void;
}

const getWallLengthCm = (wall: EmptySpaceWall) => Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);

const getIssueStyle = (severity: EmptySpaceIssue['severity']) => {
  if (severity === 'error') return 'border-red-500/25 bg-red-500/10 text-red-100';
  if (severity === 'warning') return 'border-amber-500/25 bg-amber-500/10 text-amber-100';
  return 'border-sky-500/20 bg-sky-500/10 text-sky-100';
};

const getIssueIcon = (severity: EmptySpaceIssue['severity']) => {
  if (severity === 'warning' || severity === 'error') return AlertTriangle;
  return Info;
};

export const FloorPlanAnalysisWorkbench: React.FC<FloorPlanAnalysisWorkbenchProps> = ({
  floorPlan,
  layout,
  isAnalyzing,
  onCalibrateScale,
  onRemoveWall,
  onReanalyze,
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [selectedWallId, setSelectedWallId] = useState(layout.walls[0]?.id ?? '');
  const [knownLengthCm, setKnownLengthCm] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(floorPlan);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [floorPlan]);

  useEffect(() => {
    if (!layout.walls.some(wall => wall.id === selectedWallId)) {
      setSelectedWallId(layout.walls[0]?.id ?? '');
    }
  }, [layout.walls, selectedWallId]);

  const selectedWall = useMemo(
    () => layout.walls.find(wall => wall.id === selectedWallId) ?? null,
    [layout.walls, selectedWallId],
  );
  const selectedWallLength = selectedWall ? getWallLengthCm(selectedWall) : 0;
  const actualLength = Number(knownLengthCm);
  const canCalibrate = Boolean(selectedWall && Number.isFinite(actualLength) && actualLength > 0);
  const drawingWidth = Math.max(1, layout.sourceImage.widthPx);
  const drawingHeight = Math.max(1, layout.sourceImage.heightPx);
  const warningCount = layout.issues.filter(issue => issue.severity !== 'info').length;

  const handleCalibrate = () => {
    if (!selectedWall || !canCalibrate) return;
    onCalibrateScale(selectedWall.id, actualLength);
    setKnownLengthCm('');
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative min-h-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
            layout.scale.confidence === 'calibrated'
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
              : 'border-amber-500/30 bg-amber-500/15 text-amber-200'
          }`}>
            {layout.scale.confidence === 'calibrated' ? '比例已校正' : '比例待校正'}
          </span>
          <span className="rounded-full border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] font-bold text-neutral-300">
            牆線 {layout.walls.length}
          </span>
          {warningCount > 0 && (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200">
              待確認 {warningCount}
            </span>
          )}
        </div>

        <div className="flex h-full w-full items-center justify-center p-3">
          <div className="relative max-h-full max-w-full overflow-hidden rounded-lg border border-neutral-800 bg-white shadow-2xl shadow-black/40">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="平面圖"
                className="block max-h-[calc(100vh-260px)] w-auto max-w-full select-none object-contain"
                draggable={false}
              />
            )}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${drawingWidth} ${drawingHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {layout.walls.map(wall => {
                if (!wall.pixel) return null;
                const selected = wall.id === selectedWallId;
                const confidence = wall.confidence ?? 1;
                const stroke = selected ? '#facc15' : confidence < 0.56 ? '#fb923c' : '#22d3ee';
                return (
                  <g key={wall.id}>
                    <line
                      x1={wall.pixel.x1}
                      y1={wall.pixel.y1}
                      x2={wall.pixel.x2}
                      y2={wall.pixel.y2}
                      stroke="transparent"
                      strokeWidth={Math.max(18, wall.pixel.thicknessPx + 12)}
                      strokeLinecap="round"
                      className="cursor-pointer"
                      onClick={() => setSelectedWallId(wall.id)}
                    />
                    <line
                      x1={wall.pixel.x1}
                      y1={wall.pixel.y1}
                      x2={wall.pixel.x2}
                      y2={wall.pixel.y2}
                      stroke={stroke}
                      strokeWidth={Math.max(3, Math.min(12, wall.pixel.thicknessPx))}
                      strokeLinecap="round"
                      opacity={selected ? 0.96 : 0.62}
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-950/90 p-3">
        <div className="flex items-center justify-between gap-2">
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

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-neutral-200">
            <Ruler size={14} className="text-cyan-300" />
            比例校正
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
            <span>目前選取</span>
            <span className="font-mono text-neutral-300">{selectedWall?.id ?? '--'}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
            <span>估算長度</span>
            <span className="font-mono text-neutral-300">{selectedWallLength ? `${Math.round(selectedWallLength)} cm` : '--'}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={knownLengthCm}
              onChange={event => setKnownLengthCm(event.target.value.replace(/[^\d.]/g, ''))}
              placeholder="實際 cm"
              inputMode="decimal"
              className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-cyan-500/70"
            />
            <button
              onClick={handleCalibrate}
              disabled={!canCalibrate}
              className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              套用
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-neutral-200">牆線操作</span>
            {selectedWall?.confidence !== undefined && (
              <span className="text-[10px] text-neutral-500">
                信心 {Math.round(selectedWall.confidence * 100)}%
              </span>
            )}
          </div>
          <button
            onClick={() => selectedWall && onRemoveWall(selectedWall.id)}
            disabled={!selectedWall}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-500/15 disabled:opacity-40"
          >
            <Trash2 size={13} />
            刪除誤判牆線
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900/40 p-2">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs font-bold text-neutral-200">
            <CheckCircle2 size={13} className="text-emerald-300" />
            AI 檢查
          </div>
          <div className="space-y-2">
            {layout.issues.map(issue => {
              const Icon = getIssueIcon(issue.severity);
              return (
                <button
                  key={issue.id}
                  onClick={() => issue.targetId && setSelectedWallId(issue.targetId)}
                  className={`w-full rounded-lg border p-2 text-left transition-colors ${getIssueStyle(issue.severity)} ${
                    issue.targetId ? 'hover:border-white/30' : ''
                  }`}
                >
                  <span className="flex items-center gap-2 text-[11px] font-bold">
                    <Icon size={12} />
                    {issue.title}
                  </span>
                  <span className="mt-1 block text-[10px] leading-relaxed opacity-75">
                    {issue.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};
