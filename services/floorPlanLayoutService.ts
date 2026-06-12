import { EmptySpaceIssue, EmptySpaceLayout, EmptySpaceWall } from '../types';

type AxisBand = {
  start: number;
  end: number;
  from: number;
  to: number;
};

const MAX_ANALYSIS_SIZE = 900;
const ASSUMED_LONG_SIDE_CM = 700;
const BAND_MERGE_TOLERANCE = 10;
const SPAN_OVERLAP_TOLERANCE = 22;

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('無法讀取平面圖圖片'));
  };
  image.src = url;
});

const isDarkPixel = (r: number, g: number, b: number, a: number) => {
  if (a < 40) return false;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 95;
};

const rangesOverlap = (a: AxisBand, b: AxisBand, tolerance: number) => {
  return Math.max(a.from, b.from) <= Math.min(a.to, b.to) + tolerance;
};

const mergeBand = (band: AxisBand, candidate: AxisBand) => {
  band.start = Math.min(band.start, candidate.start);
  band.end = Math.max(band.end, candidate.end);
  band.from = Math.min(band.from, candidate.from);
  band.to = Math.max(band.to, candidate.to);
};

const mergeBands = (bands: AxisBand[]) => {
  const merged: AxisBand[] = [];
  const sorted = [...bands].sort((a, b) => a.start - b.start || a.from - b.from);

  for (const band of sorted) {
    const nearby = merged.find(existing =>
      Math.abs(existing.end - band.start) <= BAND_MERGE_TOLERANCE &&
      rangesOverlap(existing, band, SPAN_OVERLAP_TOLERANCE)
    );
    if (nearby) mergeBand(nearby, band);
    else merged.push({ ...band });
  }

  return merged;
};

const collectSpans = (lineMask: Uint8Array, minRun: number, bridgeGap: number) => {
  const spans: Array<{ from: number; to: number }> = [];
  let start = -1;
  let lastDark = -1;

  for (let i = 0; i < lineMask.length; i++) {
    if (lineMask[i]) {
      if (start < 0) start = i;
      lastDark = i;
      continue;
    }

    if (start >= 0 && i - lastDark > bridgeGap) {
      const end = lastDark;
      if (end - start + 1 >= minRun) spans.push({ from: start, to: end });
      start = -1;
      lastDark = -1;
    }
  }

  if (start >= 0 && lastDark - start + 1 >= minRun) {
    spans.push({ from: start, to: lastDark });
  }

  return spans;
};

const getDenseBounds = (mask: Uint8Array, width: number, height: number) => {
  const rowCounts = new Uint16Array(height);
  const colCounts = new Uint16Array(width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      rowCounts[y]++;
      colCounts[x]++;
    }
  }

  const rowThreshold = Math.max(8, Math.round(width * 0.012));
  const colThreshold = Math.max(8, Math.round(height * 0.012));
  let minY = 0;
  let maxY = height - 1;
  let minX = 0;
  let maxX = width - 1;

  while (minY < height - 1 && rowCounts[minY] < rowThreshold) minY++;
  while (maxY > 0 && rowCounts[maxY] < rowThreshold) maxY--;
  while (minX < width - 1 && colCounts[minX] < colThreshold) minX++;
  while (maxX > 0 && colCounts[maxX] < colThreshold) maxX--;

  return { minX, minY, maxX, maxY, rowCounts, colCounts };
};

const collectProjectedHorizontalBands = (
  mask: Uint8Array,
  width: number,
  height: number,
  rowCounts: Uint16Array,
) => {
  const minRun = Math.max(36, Math.round(width * 0.05));
  const bridgeGap = Math.max(10, Math.round(width * 0.025));
  const minCoverage = Math.max(22, Math.round(width * 0.08));
  const bands: AxisBand[] = [];

  let y = 0;
  while (y < height) {
    while (y < height && rowCounts[y] < minCoverage) y++;
    const startY = y;
    while (y < height && rowCounts[y] >= minCoverage) y++;
    const endY = y - 1;
    if (endY < startY) continue;

    const lineMask = new Uint8Array(width);
    for (let yy = startY; yy <= endY; yy++) {
      for (let x = 0; x < width; x++) {
        if (mask[yy * width + x]) lineMask[x] = 1;
      }
    }

    collectSpans(lineMask, minRun, bridgeGap).forEach(span => {
      bands.push({ start: startY, end: endY, from: span.from, to: span.to });
    });
  }

  return bands;
};

const collectProjectedVerticalBands = (
  mask: Uint8Array,
  width: number,
  height: number,
  colCounts: Uint16Array,
) => {
  const minRun = Math.max(36, Math.round(height * 0.05));
  const bridgeGap = Math.max(10, Math.round(height * 0.025));
  const minCoverage = Math.max(22, Math.round(height * 0.08));
  const bands: AxisBand[] = [];

  let x = 0;
  while (x < width) {
    while (x < width && colCounts[x] < minCoverage) x++;
    const startX = x;
    while (x < width && colCounts[x] >= minCoverage) x++;
    const endX = x - 1;
    if (endX < startX) continue;

    const lineMask = new Uint8Array(height);
    for (let xx = startX; xx <= endX; xx++) {
      for (let y = 0; y < height; y++) {
        if (mask[y * width + xx]) lineMask[y] = 1;
      }
    }

    collectSpans(lineMask, minRun, bridgeGap).forEach(span => {
      bands.push({ start: startX, end: endX, from: span.from, to: span.to });
    });
  }

  return bands;
};

const collectHorizontalBands = (mask: Uint8Array, width: number, height: number) => {
  const minRun = Math.max(32, Math.round(width * 0.055));
  const bands: AxisBand[] = [];

  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      while (x < width && !mask[y * width + x]) x++;
      const start = x;
      while (x < width && mask[y * width + x]) x++;
      const end = x - 1;
      if (end - start + 1 >= minRun) {
        const candidate: AxisBand = { start: y, end: y, from: start, to: end };
        const nearby = bands.find(b => Math.abs(b.end - y) <= 8 && rangesOverlap(b, candidate, 18));
        if (nearby) mergeBand(nearby, candidate);
        else bands.push(candidate);
      }
    }
  }

  return mergeBands(bands.filter(b => (b.to - b.from) >= minRun));
};

const collectVerticalBands = (mask: Uint8Array, width: number, height: number) => {
  const minRun = Math.max(32, Math.round(height * 0.055));
  const bands: AxisBand[] = [];

  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      while (y < height && !mask[y * width + x]) y++;
      const start = y;
      while (y < height && mask[y * width + x]) y++;
      const end = y - 1;
      if (end - start + 1 >= minRun) {
        const candidate: AxisBand = { start: x, end: x, from: start, to: end };
        const nearby = bands.find(b => Math.abs(b.end - x) <= 8 && rangesOverlap(b, candidate, 18));
        if (nearby) mergeBand(nearby, candidate);
        else bands.push(candidate);
      }
    }
  }

  return mergeBands(bands.filter(b => (b.to - b.from) >= minRun));
};

const toWallId = (prefix: string, index: number) => `${prefix}-${index + 1}`;

const bandToKey = (wall: EmptySpaceWall) => {
  const horizontal = Math.abs(wall.y2 - wall.y1) < Math.abs(wall.x2 - wall.x1);
  const fixed = horizontal ? wall.y1 : wall.x1;
  const from = horizontal ? Math.min(wall.x1, wall.x2) : Math.min(wall.y1, wall.y2);
  const to = horizontal ? Math.max(wall.x1, wall.x2) : Math.max(wall.y1, wall.y2);
  return {
    horizontal,
    fixed,
    from,
    to,
  };
};

const mergeWalls = (walls: EmptySpaceWall[]) => {
  const merged: EmptySpaceWall[] = [];

  for (const wall of walls) {
    const current = bandToKey(wall);
    const match = merged.find(existing => {
      const item = bandToKey(existing);
      return item.horizontal === current.horizontal &&
        Math.abs(item.fixed - current.fixed) <= 14 &&
        Math.max(item.from, current.from) <= Math.min(item.to, current.to) + 28;
    });

    if (!match) {
      merged.push({ ...wall });
      continue;
    }

    const item = bandToKey(match);
    const from = Math.min(item.from, current.from);
    const to = Math.max(item.to, current.to);
    const fixed = (item.fixed + current.fixed) / 2;
    if (current.horizontal) {
      match.x1 = from;
      match.x2 = to;
      match.y1 = fixed;
      match.y2 = fixed;
    } else {
      match.x1 = fixed;
      match.x2 = fixed;
      match.y1 = from;
      match.y2 = to;
    }
    match.thicknessCm = Math.max(match.thicknessCm, wall.thicknessCm);
  }

  return merged;
};

const snapWallEndpoints = (walls: EmptySpaceWall[]) => {
  const snapTolerance = 34;
  const isHorizontal = (wall: EmptySpaceWall) => Math.abs(wall.y2 - wall.y1) < Math.abs(wall.x2 - wall.x1);
  const horizontal = walls.filter(isHorizontal);
  const vertical = walls.filter(wall => !isHorizontal(wall));

  const snapped = walls.map(wall => ({ ...wall }));
  const snappedById = new Map(snapped.map(wall => [wall.id, wall]));

  for (const h of horizontal) {
    const hSnap = snappedById.get(h.id);
    if (!hSnap) continue;

    const hy = h.y1;
    let hMin = Math.min(h.x1, h.x2);
    let hMax = Math.max(h.x1, h.x2);

    for (const v of vertical) {
      const vMin = Math.min(v.y1, v.y2) - snapTolerance;
      const vMax = Math.max(v.y1, v.y2) + snapTolerance;
      if (hy < vMin || hy > vMax) continue;

      const vx = v.x1;
      if (Math.abs(vx - hMin) <= snapTolerance) hMin = vx;
      if (Math.abs(vx - hMax) <= snapTolerance) hMax = vx;
      if (vx < hMin && hMin - vx <= snapTolerance) hMin = vx;
      if (vx > hMax && vx - hMax <= snapTolerance) hMax = vx;
    }

    if (h.x1 <= h.x2) {
      hSnap.x1 = hMin;
      hSnap.x2 = hMax;
    } else {
      hSnap.x1 = hMax;
      hSnap.x2 = hMin;
    }
  }

  for (const v of vertical) {
    const vSnap = snappedById.get(v.id);
    if (!vSnap) continue;

    const vx = v.x1;
    let vMin = Math.min(v.y1, v.y2);
    let vMax = Math.max(v.y1, v.y2);

    for (const h of horizontal) {
      const hMin = Math.min(h.x1, h.x2) - snapTolerance;
      const hMax = Math.max(h.x1, h.x2) + snapTolerance;
      if (vx < hMin || vx > hMax) continue;

      const hy = h.y1;
      if (Math.abs(hy - vMin) <= snapTolerance) vMin = hy;
      if (Math.abs(hy - vMax) <= snapTolerance) vMax = hy;
      if (hy < vMin && vMin - hy <= snapTolerance) vMin = hy;
      if (hy > vMax && hy - vMax <= snapTolerance) vMax = hy;
    }

    if (v.y1 <= v.y2) {
      vSnap.y1 = vMin;
      vSnap.y2 = vMax;
    } else {
      vSnap.y1 = vMax;
      vSnap.y2 = vMin;
    }
  }

  return snapped;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getWallLengthCm = (wall: EmptySpaceWall) => Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);

const getWallConfidence = (wall: EmptySpaceWall, bounds: EmptySpaceLayout['bounds']) => {
  const length = getWallLengthCm(wall);
  const thicknessScore = clamp01((wall.thicknessCm - 5) / 18);
  const lengthScore = clamp01(length / 260);
  const horizontal = Math.abs(wall.y2 - wall.y1) < Math.abs(wall.x2 - wall.x1);
  const fixed = horizontal ? wall.y1 : wall.x1;
  const boundaryDistance = horizontal
    ? Math.min(Math.abs(fixed - bounds.minY), Math.abs(fixed - bounds.maxY))
    : Math.min(Math.abs(fixed - bounds.minX), Math.abs(fixed - bounds.maxX));
  const boundaryScore = boundaryDistance < 35 ? 1 : 0;

  return clamp01(0.28 + lengthScore * 0.42 + thicknessScore * 0.18 + boundaryScore * 0.12);
};

const buildLayoutIssues = (
  walls: EmptySpaceWall[],
  scaleConfidence: EmptySpaceLayout['scale']['confidence'],
  darkPixelRatio: number,
): EmptySpaceIssue[] => {
  const issues: EmptySpaceIssue[] = [];

  if (scaleConfidence === 'estimated') {
    issues.push({
      id: 'scale-estimated',
      severity: 'warning',
      targetType: 'scale',
      title: '比例尚未校正',
      detail: '目前用圖面長邊估算尺寸。請選一段已知長度的牆線輸入實際尺寸，3D 白模會同步縮放。',
    });
  }

  if (walls.length > 48 || darkPixelRatio > 0.18) {
    issues.push({
      id: 'many-dark-elements',
      severity: 'warning',
      targetType: 'model',
      title: '可能混入家具或標註線',
      detail: '圖面中的床、櫃體、窗框或尺寸標註可能被當成牆線。請在疊圖中刪除明顯不是牆的線段。',
    });
  }

  walls
    .filter(wall => (wall.confidence ?? 1) < 0.56)
    .sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))
    .slice(0, 6)
    .forEach((wall, index) => {
      issues.push({
        id: `low-confidence-wall-${index + 1}`,
        severity: 'info',
        targetType: 'wall',
        targetId: wall.id,
        title: '牆線信心偏低',
        detail: `${wall.id} 較短或較細，可能是家具、窗框或尺寸線。`,
      });
    });

  issues.push({
    id: 'openings-next-step',
    severity: 'info',
    targetType: 'opening',
    title: '門窗尚待標記',
    detail: '第一版先建立牆體白模；下一步會把門弧、窗框與牆上缺口轉成真正開口。',
  });

  return issues;
};

export const rescaleEmptySpaceLayout = (
  layout: EmptySpaceLayout,
  factor: number,
): EmptySpaceLayout => {
  if (!Number.isFinite(factor) || factor <= 0) return layout;

  const scalePoint = (value: number) => value * factor;
  const walls = layout.walls.map(wall => ({
    ...wall,
    x1: scalePoint(wall.x1),
    y1: scalePoint(wall.y1),
    x2: scalePoint(wall.x2),
    y2: scalePoint(wall.y2),
    thicknessCm: scalePoint(wall.thicknessCm),
  }));

  return {
    ...layout,
    generatedAt: Date.now(),
    scale: {
      cmPerPixel: layout.scale.cmPerPixel * factor,
      confidence: 'calibrated',
    },
    bounds: {
      minX: scalePoint(layout.bounds.minX),
      minY: scalePoint(layout.bounds.minY),
      maxX: scalePoint(layout.bounds.maxX),
      maxY: scalePoint(layout.bounds.maxY),
    },
    walls,
    openings: layout.openings.map(opening => ({
      ...opening,
      x: scalePoint(opening.x),
      y: scalePoint(opening.y),
      widthCm: scalePoint(opening.widthCm),
    })),
    rooms: layout.rooms.map(room => ({
      ...room,
      polygon: room.polygon.map(point => ({ x: scalePoint(point.x), y: scalePoint(point.y) })),
      areaSqM: room.areaSqM ? room.areaSqM * factor * factor : room.areaSqM,
    })),
    issues: layout.issues.filter(issue => issue.targetType !== 'scale'),
    diagnostics: {
      ...layout.diagnostics,
      averageWallConfidence: walls.reduce((sum, wall) => sum + (wall.confidence ?? 0), 0) / Math.max(1, walls.length),
    },
  };
};

export const analyzeFloorPlanForEmptySpace = async (file: File): Promise<EmptySpaceLayout> => {
  const image = await loadImage(file);
  const scaleToCanvas = Math.min(1, MAX_ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scaleToCanvas));
  const height = Math.max(1, Math.round(image.naturalHeight * scaleToCanvas));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('瀏覽器不支援平面圖解析');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const mask = new Uint8Array(width * height);
  let darkCount = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const dark = isDarkPixel(
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2],
      imageData.data[offset + 3],
    );
    if (!dark) continue;
    mask[i] = 1;
    darkCount++;
    const x = i % width;
    const y = Math.floor(i / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (darkCount === 0) throw new Error('沒有偵測到可用的牆線');

  const denseBounds = getDenseBounds(mask, width, height);
  const horizontalBands = mergeBands([
    ...collectHorizontalBands(mask, width, height),
    ...collectProjectedHorizontalBands(mask, width, height, denseBounds.rowCounts),
  ]);
  const verticalBands = mergeBands([
    ...collectVerticalBands(mask, width, height),
    ...collectProjectedVerticalBands(mask, width, height, denseBounds.colCounts),
  ]);

  if (denseBounds.maxX > denseBounds.minX && denseBounds.maxY > denseBounds.minY) {
    minX = denseBounds.minX;
    minY = denseBounds.minY;
    maxX = denseBounds.maxX;
    maxY = denseBounds.maxY;
  }

  const drawingW = Math.max(1, maxX - minX);
  const drawingH = Math.max(1, maxY - minY);
  const cmPerPixel = ASSUMED_LONG_SIDE_CM / Math.max(drawingW, drawingH);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const bounds = {
    minX: (minX - centerX) * cmPerPixel,
    minY: (minY - centerY) * cmPerPixel,
    maxX: (maxX - centerX) * cmPerPixel,
    maxY: (maxY - centerY) * cmPerPixel,
  };

  const horizontalWalls: EmptySpaceWall[] = horizontalBands.map((band, index) => {
    const y = ((band.start + band.end) / 2 - centerY) * cmPerPixel;
    return {
      id: toWallId('h', index),
      x1: (band.from - centerX) * cmPerPixel,
      y1: y,
      x2: (band.to - centerX) * cmPerPixel,
      y2: y,
      thicknessCm: Math.max(8, (band.end - band.start + 1) * cmPerPixel),
    };
  });
  const verticalWalls: EmptySpaceWall[] = verticalBands.map((band, index) => {
    const x = ((band.start + band.end) / 2 - centerX) * cmPerPixel;
    return {
      id: toWallId('v', index),
      x1: x,
      y1: (band.from - centerY) * cmPerPixel,
      x2: x,
      y2: (band.to - centerY) * cmPerPixel,
      thicknessCm: Math.max(8, (band.end - band.start + 1) * cmPerPixel),
    };
  });

  const walls = snapWallEndpoints(mergeWalls([...horizontalWalls, ...verticalWalls]))
    .filter(wall => getWallLengthCm(wall) >= 60)
    .sort((a, b) => getWallLengthCm(b) - getWallLengthCm(a))
    .slice(0, 120)
    .map((wall, index) => ({
      ...wall,
      id: toWallId(wall.id.startsWith('h') ? 'h' : 'v', index),
    }))
    .map(wall => ({
      ...wall,
      confidence: getWallConfidence(wall, bounds),
      pixel: {
        x1: centerX + wall.x1 / cmPerPixel,
        y1: centerY + wall.y1 / cmPerPixel,
        x2: centerX + wall.x2 / cmPerPixel,
        y2: centerY + wall.y2 / cmPerPixel,
        thicknessPx: Math.max(1, wall.thicknessCm / cmPerPixel),
      },
    }));
  const averageWallConfidence = walls.reduce((sum, wall) => sum + (wall.confidence ?? 0), 0) / Math.max(1, walls.length);
  const issues = buildLayoutIssues(walls, 'estimated', darkCount / (width * height));

  return {
    source: 'floor_plan',
    imageName: file.name,
    generatedAt: Date.now(),
    scale: {
      cmPerPixel,
      confidence: 'estimated',
    },
    bounds,
    sourceImage: {
      widthPx: width,
      heightPx: height,
      drawingBoundsPx: { minX, minY, maxX, maxY },
    },
    walls,
    openings: [],
    rooms: [],
    issues,
    diagnostics: {
      imageWidth: width,
      imageHeight: height,
      darkPixelRatio: darkCount / (width * height),
      detectedHorizontalBands: horizontalBands.length,
      detectedVerticalBands: verticalBands.length,
      averageWallConfidence,
    },
  };
};
