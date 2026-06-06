import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DESIGN_STYLE_LABELS, DesignStyle, RoomType } from '../types';
import { Armchair, Camera, Sun, Moon, RotateCcw, Box, HelpCircle, Palette, Eye, ArrowRightLeft, Move, Trash2, CheckCircle2, Sliders, Download, Info } from 'lucide-react';
import {
  buildLivingRoomFurniture,
  buildBedroomFurniture,
  buildDiningRoomFurniture,
  buildOfficeFurniture,
  buildBathroomFurniture,
  buildKitchenFurniture,
  buildStudioFurniture,
  applyInteraction
} from './ThreeRoomFurniture';

interface ThreeRoomViewerProps {
  style: DesignStyle;
  roomType: RoomType;
  appliedRefinements: string[];
  onApplyRefinement: (prompt: string, isToRemove?: boolean) => void;
  onRoomTypeChange?: (roomType: RoomType) => void;
  isSidebarCollapsed?: boolean;
}

// Preset textures/materials mappings
const FLOOR_TYPES = [
  { id: 'oak', name: '天然中性橡木地板 (Oak Wood)', color: 0xc19a6b, roughness: 0.6, metalness: 0.1, pattern: 'wood' },
  { id: 'herringbone', name: '經典人文人字拼木地板 (Herringbone Oak)', color: 0x8b5a2b, roughness: 0.5, metalness: 0.1, pattern: 'herringbone' },
  { id: 'walnut', name: '奢華深沉胡桃木地板 (Walnut Wood)', color: 0x3a2512, roughness: 0.45, metalness: 0.1, pattern: 'wood' },
  { id: 'tile', name: '極簡亮面晶白釉面大磁磚 (Polished White Tile)', color: 0xf5f5f3, roughness: 0.12, metalness: 0.25, pattern: 'tile' },
  { id: 'slate_tile', name: '現代防滑板岩深灰磁磚 (Matte Slate Tile)', color: 0x42464c, roughness: 0.6, metalness: 0.0, pattern: 'tile' },
  { id: 'vintage_tile', name: '復古暖紅陶土手感地磚 (Vintage Terracotta Tile)', color: 0xb5654c, roughness: 0.7, metalness: 0.0, pattern: 'tile' },
  { id: 'concrete', name: '安藤工業清水混凝土 (Concrete Floor)', color: 0x818488, roughness: 0.75, metalness: 0.0, pattern: 'concrete' },
  { id: 'marble', name: '雅典娜爵士白紋理大理石 (Marble Floor)', color: 0xeaecef, roughness: 0.15, metalness: 0.2, pattern: 'marble' },
  { id: 'terrazzo', name: '微風摩登義大利水磨石 (Italian Terrazzo)', color: 0xe1d9cf, roughness: 0.35, metalness: 0.15, pattern: 'terrazzo' },
  { id: 'carpet', name: '喀什米爾綿軟奢華羊毛地毯 (Wool Carpet)', color: 0xdfdcd6, roughness: 0.95, metalness: 0.0, pattern: 'carpet' }
];

const WALL_COLORS = [
  { id: 'offwhite', name: '極簡暖白 (Minimal White)', color: 0xfaf9f6 },
  { id: 'sage', name: '北歐森林鼠尾草綠 (Sage Green)', color: 0x8f9779 },
  { id: 'slate', name: '現代工業岩石灰 (Navy Slate)', color: 0x363d4a },
  { id: 'beige', name: '侘寂沙丘暖褐 (Wabi Beige)', color: 0xd2b48c }
];

const createViewerRoundedBox = (
  width: number,
  height: number,
  depth: number,
  material: THREE.Material | THREE.Material[],
  radius: number = 0.035,
  segments: number = 3
): THREE.Mesh => {
  const safeRadius = Math.max(0.001, Math.min(radius, width * 0.45, height * 0.45, depth * 0.45));
  return new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, segments, safeRadius), material);
};

const blendViewerHexColor = (source: number, target: number, amount: number): number => {
  const sr = (source >> 16) & 255;
  const sg = (source >> 8) & 255;
  const sb = source & 255;
  const tr = (target >> 16) & 255;
  const tg = (target >> 8) & 255;
  const tb = target & 255;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return (mix(sr, tr) << 16) | (mix(sg, tg) << 8) | mix(sb, tb);
};

const createViewerSoftSquarePillowBody = (
  width: number,
  height: number,
  depth: number,
  material: THREE.Material
): THREE.Mesh => {
  const bodyMaterial = material.clone();
  bodyMaterial.side = THREE.DoubleSide;
  const body = createViewerRoundedBox(width, height, depth, bodyMaterial, 0.035, 5);
  body.geometry.computeVertexNormals();
  return body;
};

const createViewerPillowPipe = (length: number, axis: 'x' | 'y', material: THREE.Material): THREE.Mesh => {
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, length, 10), material);
  if (axis === 'x') pipe.rotation.z = Math.PI / 2;
  return pipe;
};

type ViewerPillowPattern = 'plain' | 'border' | 'center_band' | 'twin_stripe' | 'woven_cross';

interface ViewerPillowSpec {
  color: number;
  accentColor: number;
  pattern: ViewerPillowPattern;
}

const getAccentCushionSpecs = (style: DesignStyle): ViewerPillowSpec[] => {
  switch (style) {
    case DesignStyle.MODERN:
      return [
        { color: 0xf0f0ec, accentColor: 0x161616, pattern: 'border' },
        { color: 0x53606b, accentColor: 0xe5e2dc, pattern: 'twin_stripe' },
        { color: 0xb9b7b0, accentColor: 0x2d3238, pattern: 'center_band' }
      ];
    case DesignStyle.SCANDINAVIAN:
      return [
        { color: 0xb5c3d6, accentColor: 0xf4eadc, pattern: 'twin_stripe' },
        { color: 0x9ab0a3, accentColor: 0xe8cfb2, pattern: 'border' },
        { color: 0xf0e7d6, accentColor: 0x778ca3, pattern: 'center_band' }
      ];
    case DesignStyle.MID_CENTURY_MODERN:
      return [
        { color: 0xe0b543, accentColor: 0x0a5f6b, pattern: 'center_band' },
        { color: 0xd76c49, accentColor: 0xf2df9a, pattern: 'twin_stripe' },
        { color: 0xf2df9a, accentColor: 0x0f6a72, pattern: 'border' }
      ];
    case DesignStyle.LUXURY:
      return [
        { color: 0x101010, accentColor: 0xd4af37, pattern: 'border' },
        { color: 0xd5b456, accentColor: 0x0d2b1f, pattern: 'center_band' },
        { color: 0xf4d36f, accentColor: 0x17382c, pattern: 'twin_stripe' }
      ];
    case DesignStyle.BOHEMIAN:
      return [
        { color: 0xc6643b, accentColor: 0xf0b247, pattern: 'woven_cross' },
        { color: 0x245d57, accentColor: 0xf3dfbc, pattern: 'border' },
        { color: 0xe78d41, accentColor: 0x8b2f24, pattern: 'twin_stripe' }
      ];
    case DesignStyle.JAPANDI:
      return [
        { color: 0xd8d0c4, accentColor: 0x8b857f, pattern: 'center_band' },
        { color: 0x9b9187, accentColor: 0xefe8dc, pattern: 'plain' },
        { color: 0xc8c0b4, accentColor: 0x5f5a54, pattern: 'border' }
      ];
    case DesignStyle.COASTAL:
      return [
        { color: 0xf7f8f4, accentColor: 0x2e5f82, pattern: 'twin_stripe' },
        { color: 0xa9c9d6, accentColor: 0xffffff, pattern: 'border' },
        { color: 0x6e93aa, accentColor: 0xf7f8f4, pattern: 'center_band' }
      ];
    case DesignStyle.INDUSTRIAL:
      return [
        { color: 0x30343a, accentColor: 0xb46a3c, pattern: 'center_band' },
        { color: 0x5c4a3e, accentColor: 0x1c1e22, pattern: 'border' },
        { color: 0x6f6a63, accentColor: 0x2d3436, pattern: 'twin_stripe' }
      ];
    default:
      return [
        { color: 0xd69a8b, accentColor: 0xf4dfd8, pattern: 'center_band' },
        { color: 0x8ba6d6, accentColor: 0xffffff, pattern: 'twin_stripe' },
        { color: 0x93b599, accentColor: 0xf5e8cb, pattern: 'border' }
      ];
  }
};

const createViewerThrowPillow = (spec: ViewerPillowSpec): THREE.Group => {
  const group = new THREE.Group();
  const fabricMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.88, metalness: 0 });
  const seamMat = new THREE.MeshStandardMaterial({
    color: blendViewerHexColor(spec.color, spec.color > 0x888888 ? 0x6f665c : 0xffffff, 0.14),
    roughness: 0.94,
    metalness: 0
  });
  const accentMat = new THREE.MeshStandardMaterial({ color: spec.accentColor, roughness: 0.9, metalness: 0 });

  const body = createViewerSoftSquarePillowBody(0.5, 0.5, 0.15, fabricMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const addPiping = (axis: 'x' | 'y', length: number, x: number, y: number) => {
    const pipe = createViewerPillowPipe(length, axis, seamMat);
    pipe.position.set(x, y, 0.083);
    pipe.castShadow = true;
    group.add(pipe);
  };

  addPiping('x', 0.41, 0, 0.215);
  addPiping('x', 0.41, 0, -0.215);
  addPiping('y', 0.41, -0.215, 0);
  addPiping('y', 0.41, 0.215, 0);

  [-1, 1].forEach((xDir) => {
    [-1, 1].forEach((yDir) => {
      const corner = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), seamMat);
      corner.scale.set(1, 0.78, 0.5);
      corner.position.set(xDir * 0.216, yDir * 0.216, 0.086);
      corner.castShadow = true;
      group.add(corner);
    });
  });

  const addBand = (width: number, height: number, x: number, y: number, rotZ: number = 0) => {
    const band = createViewerRoundedBox(width, height, 0.006, accentMat, 0.003, 2);
    band.position.set(x, y, 0.088);
    band.rotation.z = rotZ;
    band.castShadow = true;
    group.add(band);
  };

  switch (spec.pattern) {
    case 'border':
      addBand(0.25, 0.011, 0, 0.125);
      addBand(0.25, 0.011, 0, -0.125);
      addBand(0.011, 0.25, -0.125, 0);
      addBand(0.011, 0.25, 0.125, 0);
      break;
    case 'center_band':
      addBand(0.27, 0.042, 0, 0);
      break;
    case 'twin_stripe':
      addBand(0.28, 0.011, 0, 0.055);
      addBand(0.28, 0.011, 0, -0.055);
      break;
    case 'woven_cross':
      addBand(0.28, 0.014, 0, 0, Math.PI / 4);
      addBand(0.28, 0.014, 0, 0, -Math.PI / 4);
      break;
    default:
      break;
  }

  return group;
};

const getAreaRugColor = (style: DesignStyle) => {
  switch (style) {
    case DesignStyle.INDUSTRIAL:
      return 0x2e2e2e;
    case DesignStyle.BOHEMIAN:
      return 0xc68e70;
    case DesignStyle.SCANDINAVIAN:
      return 0xd7d4cc;
    case DesignStyle.LUXURY:
      return 0x112233;
    case DesignStyle.COASTAL:
      return 0xdce8ec;
    case DesignStyle.JAPANDI:
      return 0xd8d0c4;
    default:
      return 0xe5e1d8;
  }
};

const getCurtainColor = (style: DesignStyle) => {
  switch (style) {
    case DesignStyle.INDUSTRIAL:
      return 0x53575c;
    case DesignStyle.LUXURY:
      return 0x1f342d;
    case DesignStyle.BOHEMIAN:
      return 0xd6a06c;
    case DesignStyle.COASTAL:
      return 0xf6f8fb;
    case DesignStyle.SCANDINAVIAN:
      return 0xdfe5e1;
    case DesignStyle.JAPANDI:
      return 0xd7cbbb;
    default:
      return 0xdedbd4;
  }
};

const getThrowBlanketColors = (style: DesignStyle) => {
  switch (style) {
    case DesignStyle.MODERN:
      return { base: 0xd7d0c4, accent: 0x2e4057 };
    case DesignStyle.SCANDINAVIAN:
      return { base: 0xe6dfd2, accent: 0x8fa59a };
    case DesignStyle.MID_CENTURY_MODERN:
      return { base: 0xd76c49, accent: 0xe0b543 };
    case DesignStyle.LUXURY:
      return { base: 0xe1c16e, accent: 0x17382c };
    case DesignStyle.BOHEMIAN:
      return { base: 0xc6643b, accent: 0xf0b247 };
    case DesignStyle.COASTAL:
      return { base: 0xf1f5f4, accent: 0x6e93aa };
    case DesignStyle.INDUSTRIAL:
      return { base: 0xb46a3c, accent: 0x2d3436 };
    case DesignStyle.JAPANDI:
      return { base: 0xd8d0c4, accent: 0x6b6258 };
    default:
      return { base: 0xcfc8bc, accent: 0xf7f4ec };
  }
};

const createThrowBlanketMesh = (style: DesignStyle): THREE.Group => {
  const group = new THREE.Group();
  const colors = getThrowBlanketColors(style);
  const blanketMat = new THREE.MeshStandardMaterial({ color: colors.base, roughness: 0.93, metalness: 0 });
  const seamMat = new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.95, metalness: 0 });

  const seatPanel = createViewerRoundedBox(0.68, 0.028, 0.78, blanketMat, 0.018, 3);
  seatPanel.position.set(0, 0.018, 0);
  seatPanel.castShadow = true;
  seatPanel.receiveShadow = true;
  group.add(seatPanel);

  const frontDrop = createViewerRoundedBox(0.68, 0.34, 0.026, blanketMat, 0.014, 3);
  frontDrop.position.set(0, -0.17, 0.405);
  frontDrop.castShadow = true;
  frontDrop.receiveShadow = true;
  group.add(frontDrop);

  const topRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 14), blanketMat);
  topRoll.rotation.z = Math.PI / 2;
  topRoll.position.set(0, 0.05, -0.36);
  topRoll.castShadow = true;
  group.add(topRoll);

  [-0.2, 0.02, 0.24].forEach((x, idx) => {
    const fold = createViewerRoundedBox(0.012, 0.018, 0.67, seamMat, 0.004, 2);
    fold.position.set(x, 0.046, -0.01 + idx * 0.015);
    fold.rotation.z = idx === 1 ? -0.025 : 0.02;
    fold.castShadow = true;
    group.add(fold);
  });

  [-0.22, 0.22].forEach((x) => {
    const frontPleat = createViewerRoundedBox(0.014, 0.26, 0.01, seamMat, 0.004, 2);
    frontPleat.position.set(x, -0.17, 0.424);
    frontPleat.castShadow = true;
    group.add(frontPleat);
  });

  const lowerHem = createViewerRoundedBox(0.62, 0.018, 0.012, seamMat, 0.004, 2);
  lowerHem.position.set(0, -0.33, 0.424);
  lowerHem.castShadow = true;
  group.add(lowerHem);

  const fringeCordMat = new THREE.MeshStandardMaterial({
    color: blendViewerHexColor(colors.base, colors.accent, 0.72),
    roughness: 0.98,
    metalness: 0
  });
  const fringeKnotMat = new THREE.MeshStandardMaterial({
    color: blendViewerHexColor(colors.base, colors.accent, 0.58),
    roughness: 0.98,
    metalness: 0
  });

  const braidedEdge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.64, 10), fringeKnotMat);
  braidedEdge.rotation.z = Math.PI / 2;
  braidedEdge.position.set(0, -0.35, 0.438);
  braidedEdge.castShadow = true;
  group.add(braidedEdge);

  for (let i = 0; i < 11; i++) {
    const x = -0.31 + i * 0.062;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), fringeKnotMat);
    knot.scale.set(1, 0.82, 0.72);
    knot.position.set(x, -0.356, 0.442);
    knot.castShadow = true;
    group.add(knot);

    for (let strand = 0; strand < 3; strand++) {
      const offset = strand - 1;
      const length = 0.115 + ((i + strand) % 3) * 0.014;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0018, length, 5), fringeCordMat);
      cord.position.set(x + offset * 0.008, -0.36 - length / 2, 0.442 + offset * 0.003);
      cord.rotation.x = offset * 0.055;
      cord.rotation.z = (i % 2 === 0 ? 0.025 : -0.025) + offset * 0.035;
      cord.castShadow = true;
      group.add(cord);

      const tasselTip = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 6, 5), fringeCordMat);
      tasselTip.scale.set(1, 0.72, 1);
      tasselTip.position.set(x + offset * 0.008, -0.362 - length, 0.442 + offset * 0.003);
      tasselTip.castShadow = true;
      group.add(tasselTip);
    }
  }

  return group;
};

const createWallMirrorMesh = (style: DesignStyle): THREE.Group => {
  const group = new THREE.Group();
  const frameColor = style === DesignStyle.LUXURY ? 0xd4af37 : style === DesignStyle.INDUSTRIAL ? 0x202124 : 0xb8a17a;
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xbfd2dc, metalness: 0.95, roughness: 0.03 });
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.75, roughness: 0.18 });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.012, 48), mirrorMat);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  group.add(disc);

  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.327, 0.018, 10, 48), frameMat);
  frame.castShadow = true;
  group.add(frame);

  return group;
};

// Helper to build detailed 3D Doors matching styles
const createDoorMesh = (style: string, colorHex: number) => {
  const doorGroup = new THREE.Group();
  
  const doorW = 0.9;
  const doorH = 2.0;
  const doorThickness = 0.04;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
  const doorMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6, metalness: 0.1 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xc5a059, metalness: 0.8, roughness: 0.2 }); // Gold/brass
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd1ebf9, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.7 });

  // 1. Door Frame casing around top, left, right
  const fThickness = 0.06;
  const fDepth = 0.08;
  
  // Left post
  const fLeftGeo = new THREE.BoxGeometry(fThickness, doorH + fThickness, fDepth);
  const fLeft = new THREE.Mesh(fLeftGeo, frameMat);
  fLeft.position.set(-doorW / 2 - fThickness / 2, (doorH + fThickness) / 2, 0);
  fLeft.castShadow = true;
  fLeft.receiveShadow = true;
  doorGroup.add(fLeft);

  // Right post
  const fRightGeo = new THREE.BoxGeometry(fThickness, doorH + fThickness, fDepth);
  const fRight = new THREE.Mesh(fRightGeo, frameMat);
  fRight.position.set(doorW / 2 + fThickness / 2, (doorH + fThickness) / 2, 0);
  fRight.castShadow = true;
  fRight.receiveShadow = true;
  doorGroup.add(fRight);

  // Top header
  const fTopGeo = new THREE.BoxGeometry(doorW + fThickness * 2, fThickness, fDepth);
  const fTop = new THREE.Mesh(fTopGeo, frameMat);
  fTop.position.set(0, doorH + fThickness / 2, 0);
  fTop.castShadow = true;
  fTop.receiveShadow = true;
  doorGroup.add(fTop);

  // 2. Door Leaves depending on style
  if (style === 'modern') {
    // Single slick flat door
    const leafGeo = new THREE.BoxGeometry(doorW - 0.01, doorH - 0.01, doorThickness);
    const leaf = new THREE.Mesh(leafGeo, doorMat);
    leaf.position.set(0, doorH / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    doorGroup.add(leaf);

    // Standard L-shape handle
    const hBaseGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8);
    hBaseGeo.rotateX(Math.PI / 2);
    const hBase = new THREE.Mesh(hBaseGeo, handleMat);
    hBase.position.set(doorW / 2 - 0.1, 0.95, doorThickness / 2 + 0.02);
    doorGroup.add(hBase);

    const hLeverGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8);
    hLeverGeo.rotateZ(Math.PI / 2);
    const hLever = new THREE.Mesh(hLeverGeo, handleMat);
    hLever.position.set(doorW / 2 - 0.1 + 0.04, 0.95, doorThickness / 2 + 0.05);
    doorGroup.add(hLever);

  } else if (style === 'traditional') {
    // Paneled door
    const leafGeo = new THREE.BoxGeometry(doorW - 0.01, doorH - 0.01, doorThickness);
    const leaf = new THREE.Mesh(leafGeo, doorMat);
    leaf.position.set(0, doorH / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    doorGroup.add(leaf);

    // Add raised/recessed vertical panel mouldings
    const panelMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
    const pWidth = 0.3;
    const pHeight1 = 0.6;
    const pHeight2 = 0.8;
    const pThickness = 0.005;

    // Bottom left panel
    const bL_Geo = new THREE.BoxGeometry(pWidth, pHeight1, pThickness);
    const bL = new THREE.Mesh(bL_Geo, panelMat);
    bL.position.set(-0.18, 0.45, doorThickness / 2 + 0.003);
    bL.castShadow = true;
    doorGroup.add(bL);

    // Bottom right panel
    const bR = bL.clone();
    bR.position.x = 0.18;
    doorGroup.add(bR);

    // Top left panel
    const tL_Geo = new THREE.BoxGeometry(pWidth, pHeight2, pThickness);
    const tL = new THREE.Mesh(tL_Geo, panelMat);
    tL.position.set(-0.18, 1.4, doorThickness / 2 + 0.003);
    tL.castShadow = true;
    doorGroup.add(tL);

    // Top right panel
    const tR = tL.clone();
    tR.position.x = 0.18;
    doorGroup.add(tR);

    // Brass traditional handle
    const handlePlateGeo = new THREE.BoxGeometry(0.04, 0.22, 0.005);
    const handlePlate = new THREE.Mesh(handlePlateGeo, handleMat);
    handlePlate.position.set(doorW / 2 - 0.1, 0.95, doorThickness / 2 + 0.005);
    doorGroup.add(handlePlate);

    const hKnobGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const hKnob = new THREE.Mesh(hKnobGeo, handleMat);
    hKnob.position.set(doorW / 2 - 0.1, 0.95, doorThickness / 2 + 0.035);
    doorGroup.add(hKnob);

  } else if (style === 'glass') {
    // Glass paneled door: frame around glass
    const frameWidth = 0.12;
    // Left stile
    const leftStileGeo = new THREE.BoxGeometry(frameWidth, doorH, doorThickness);
    const leftStile = new THREE.Mesh(leftStileGeo, doorMat);
    leftStile.position.set(-doorW / 2 + frameWidth / 2, doorH / 2, 0);
    leftStile.castShadow = true;
    doorGroup.add(leftStile);

    // Right stile
    const rightStileGeo = new THREE.BoxGeometry(frameWidth, doorH, doorThickness);
    const rightStile = new THREE.Mesh(rightStileGeo, doorMat);
    rightStile.position.set(doorW / 2 - frameWidth / 2, doorH / 2, 0);
    rightStile.castShadow = true;
    doorGroup.add(rightStile);

    // Top rail
    const topRailGeo = new THREE.BoxGeometry(doorW - frameWidth * 2, frameWidth, doorThickness);
    const topRail = new THREE.Mesh(topRailGeo, doorMat);
    topRail.position.set(0, doorH - frameWidth / 2, 0);
    topRail.castShadow = true;
    doorGroup.add(topRail);

    // Bottom rail
    const bottomRailGeo = new THREE.BoxGeometry(doorW - frameWidth * 2, frameWidth * 1.5, doorThickness);
    const bottomRail = new THREE.Mesh(bottomRailGeo, doorMat);
    bottomRail.position.set(0, frameWidth * 1.5 / 2, 0);
    bottomRail.castShadow = true;
    doorGroup.add(bottomRail);

    // Glass center
    const glassGeo = new THREE.BoxGeometry(doorW - frameWidth * 2, doorH - frameWidth * 2.5, 0.01);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, doorH / 2 + frameWidth * 0.25, 0);
    doorGroup.add(glass);

    // Handle
    const hBaseGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8);
    hBaseGeo.rotateX(Math.PI / 2);
    const hBase = new THREE.Mesh(hBaseGeo, handleMat);
    hBase.position.set(doorW / 2 - 0.15, 0.95, doorThickness / 2 + 0.02);
    doorGroup.add(hBase);

    const hLeverGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8);
    hLeverGeo.rotateZ(Math.PI / 2);
    const hLever = new THREE.Mesh(hLeverGeo, handleMat);
    hLever.position.set(doorW / 2 - 0.15 + 0.04, 0.95, doorThickness / 2 + 0.05);
    doorGroup.add(hLever);

  } else if (style === 'sliding') {
    // Sliding Barn Door with horizontal plank texture styling
    const leafGeo = new THREE.BoxGeometry(doorW + 0.05, doorH + 0.02, doorThickness);
    const leaf = new THREE.Mesh(leafGeo, doorMat);
    // Sliding door is offset slightly outward (Z-axis direction)
    leaf.position.set(0.15, (doorH + 0.02) / 2, 0.04); 
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    doorGroup.add(leaf);

    // Add wooden diagonal brace overlay
    const braceMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
    const bGeo = new THREE.BoxGeometry(0.08, doorH, 0.005);
    const b1 = new THREE.Mesh(bGeo, braceMat);
    b1.position.set(0.15, doorH / 2, 0.04 + doorThickness / 2 + 0.003);
    b1.rotation.z = 0.35;
    b1.castShadow = true;
    doorGroup.add(b1);

    // High metal rail sliding track
    const trackGeo = new THREE.BoxGeometry(doorW * 2.2, 0.03, 0.03);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.3 });
    const track = new THREE.Mesh(trackGeo, metalMat);
    track.position.set(0.15, doorH + 0.08, 0.04);
    doorGroup.add(track);

    // Hangers attaching door to track
    const hangerGeo = new THREE.BoxGeometry(0.04, 0.15, 0.01);
    const h1 = new THREE.Mesh(hangerGeo, metalMat);
    h1.position.set(-doorW / 2 + 0.2, doorH + 0.04, 0.04 + doorThickness / 2);
    const h2 = h1.clone();
    h2.position.x = doorW / 2 + 0.1;
    doorGroup.add(h1);
    doorGroup.add(h2);

    // Flush black handle pull
    const pullGeo = new THREE.BoxGeometry(0.02, 0.18, 0.015);
    const pull = new THREE.Mesh(pullGeo, metalMat);
    pull.position.set(-doorW / 2 + 0.22, 0.95, 0.04 + doorThickness / 2 + 0.01);
    doorGroup.add(pull);

  } else if (style === 'double_modern') {
    // Double Modern Door
    const leafW = doorW * 0.52;
    const dpMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6 });

    // Left leaf (half open)
    const leafLGeo = new THREE.BoxGeometry(leafW, doorH, doorThickness);
    const leafL = new THREE.Mesh(leafLGeo, dpMat);
    leafL.position.set(leafW / 2, doorH / 2, 0);
    
    // Group to pivot easily
    const pivotL = new THREE.Group();
    pivotL.position.set(-doorW / 2, 0, 0);
    pivotL.add(leafL);
    pivotL.rotation.y = Math.PI / 5; // swung open 36 deg
    doorGroup.add(pivotL);

    // Right leaf (shut)
    const leafR = new THREE.Mesh(leafLGeo, dpMat);
    leafR.position.set(-leafW / 2, doorH / 2, 0);
    
    const pivotR = new THREE.Group();
    pivotR.position.set(doorW / 2, 0, 0);
    pivotR.add(leafR);
    doorGroup.add(pivotR);

    // Elegant handles
    const hPlateL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.15, 0.01), handleMat);
    hPlateL.position.set(leafW - 0.03, 0.95, doorThickness / 2 + 0.005);
    pivotL.add(hPlateL);

    const hPlateR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.15, 0.01), handleMat);
    hPlateR.position.set(-leafW + 0.03, 0.95, doorThickness / 2 + 0.005);
    pivotR.add(hPlateR);

  } else if (style === 'double_traditional') {
    // Double Paneled Traditional Door
    const leafW = doorW * 0.52;
    const dpMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });

    // Left leaf (shut)
    const leafLGeo = new THREE.BoxGeometry(leafW, doorH, doorThickness);
    const leafL = new THREE.Mesh(leafLGeo, dpMat);
    leafL.position.set(leafW / 2, doorH / 2, 0);

    const pivotL = new THREE.Group();
    pivotL.position.set(-doorW / 2, 0, 0);
    pivotL.add(leafL);
    doorGroup.add(pivotL);

    // Right leaf (shut or slightly open)
    const leafR = new THREE.Mesh(leafLGeo, dpMat);
    leafR.position.set(-leafW / 2, doorH / 2, 0);

    const pivotR = new THREE.Group();
    pivotR.position.set(doorW / 2, 0, 0);
    pivotR.add(leafR);
    pivotR.rotation.y = -Math.PI / 7; // swung open slightly
    doorGroup.add(pivotR);

    // Traditional panels
    const pW = leafW - 0.08;
    const pH1 = 0.6;
    const pH2 = 0.8;
    const pTh = 0.004;

    const panelL1 = new THREE.Mesh(new THREE.BoxGeometry(pW, pH1, pTh), dpMat);
    panelL1.position.set(leafW / 2, 0.45, doorThickness / 2 + 0.002);
    pivotL.add(panelL1);

    const panelL2 = new THREE.Mesh(new THREE.BoxGeometry(pW, pH2, pTh), dpMat);
    panelL2.position.set(leafW / 2, 1.4, doorThickness / 2 + 0.002);
    pivotL.add(panelL2);

    const panelR1 = new THREE.Mesh(new THREE.BoxGeometry(pW, pH1, pTh), dpMat);
    panelR1.position.set(-leafW / 2, 0.45, doorThickness / 2 + 0.002);
    pivotR.add(panelR1);

    const panelR2 = new THREE.Mesh(new THREE.BoxGeometry(pW, pH2, pTh), dpMat);
    panelR2.position.set(-leafW / 2, 1.4, doorThickness / 2 + 0.002);
    pivotR.add(panelR2);

    // Handles
    const hL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), handleMat);
    hL.position.set(leafW - 0.03, 0.95, doorThickness / 2 + 0.015);
    pivotL.add(hL);

    const hR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), handleMat);
    hR.position.set(-leafW + 0.03, 0.95, doorThickness / 2 + 0.015);
    pivotR.add(hR);
  }

  return doorGroup;
};

// Helper to build detailed 3D Windows matching styles
const createWindowMesh = (style: string, w: number, h: number) => {
  const windowGroup = new THREE.Group();
  
  const d = 0.08; // frame depth
  const frameColor = 0xffffff;
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdef0fa,
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.9,
    side: THREE.DoubleSide
  });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });

  // 1. Outer Frame casing (4 bars)
  const borderWidth = 0.05;
  
  // Left border
  const bLeft = new THREE.Mesh(new THREE.BoxGeometry(borderWidth, h, d), frameMat);
  bLeft.position.set(-w / 2 + borderWidth / 2, 0, 0);
  windowGroup.add(bLeft);

  // Right border
  const bRight = new THREE.Mesh(new THREE.BoxGeometry(borderWidth, h, d), frameMat);
  bRight.position.set(w / 2 - borderWidth / 2, 0, 0);
  windowGroup.add(bRight);

  // Top border
  const bTop = new THREE.Mesh(new THREE.BoxGeometry(w, borderWidth, d), frameMat);
  bTop.position.set(0, h / 2 - borderWidth / 2, 0);
  windowGroup.add(bTop);

  // Bottom sill
  const bBottom = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, borderWidth * 1.4, d + 0.03), frameMat);
  bBottom.position.set(0, -h / 2 + borderWidth / 2, 0.01);
  windowGroup.add(bBottom);

  // 2. Inner contents based on style
  if (style === 'modern_single') {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - borderWidth * 2, h - borderWidth * 2, 0.01), glassMat);
    glass.position.set(0, 0, 0);
    windowGroup.add(glass);
    
    // Tiny inner sash frame
    const sMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.5 });
    const sashInnerGeo = new THREE.BoxGeometry(w - borderWidth * 2 - 0.02, 0.02, 0.02);
    const sTop = new THREE.Mesh(sashInnerGeo, sMat); sTop.position.y = h/2 - borderWidth - 0.01; windowGroup.add(sTop);
    const sBottom = new THREE.Mesh(sashInnerGeo, sMat); sBottom.position.y = -h/2 + borderWidth + 0.01; windowGroup.add(sBottom);

  } else if (style === 'traditional_single') {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - borderWidth * 2, h - borderWidth * 2, 0.01), glassMat);
    glass.position.set(0, 0, 0);
    windowGroup.add(glass);

    const dividerWidth = 0.018;
    // Vertical divider
    const vert = new THREE.Mesh(new THREE.BoxGeometry(dividerWidth, h - borderWidth * 2, d - 0.02), frameMat);
    windowGroup.add(vert);

    // Horizontal dividers (two lines)
    const horiz1 = new THREE.Mesh(new THREE.BoxGeometry(w - borderWidth * 2, dividerWidth, d - 0.02), frameMat);
    horiz1.position.y = (h - borderWidth * 2) / 6;
    const horiz2 = horiz1.clone();
    horiz2.position.y = -(h - borderWidth * 2) / 6;
    windowGroup.add(horiz1);
    windowGroup.add(horiz2);

  } else if (style === 'sliding') {
    const paneW = (w - borderWidth * 2) / 2 + 0.01;
    const paneH = h - borderWidth * 2;
    
    // Left sliding panel
    const paneLGroup = new THREE.Group();
    paneLGroup.position.set(-w / 4 + 0.01, 0, 0.015);
    const glassL = new THREE.Mesh(new THREE.BoxGeometry(paneW, paneH, 0.01), glassMat);
    paneLGroup.add(glassL);
    
    // Frame for active pane
    const pBorder = 0.03;
    const fL = new THREE.Mesh(new THREE.BoxGeometry(pBorder, paneH, 0.02), frameMat); fL.position.x = -paneW/2 + pBorder/2; paneLGroup.add(fL);
    const fR = new THREE.Mesh(new THREE.BoxGeometry(pBorder, paneH, 0.02), frameMat); fR.position.x = paneW/2 - pBorder/2; paneLGroup.add(fR);
    const fT = new THREE.Mesh(new THREE.BoxGeometry(paneW, pBorder, 0.02), frameMat); fT.position.y = paneH/2 - pBorder/2; paneLGroup.add(fT);
    const fB = new THREE.Mesh(new THREE.BoxGeometry(paneW, pBorder, 0.02), frameMat); fB.position.y = -paneH/2 + pBorder/2; paneLGroup.add(fB);
    windowGroup.add(paneLGroup);

    // Right sliding panel (offset behind and slightly open for organic vibe)
    const paneRGroup = new THREE.Group();
    paneRGroup.position.set(w / 4 - 0.01 - 0.12, 0, -0.015); 
    const glassR = new THREE.Mesh(new THREE.BoxGeometry(paneW, paneH, 0.01), glassMat);
    paneRGroup.add(glassR);
    const fL_R = fL.clone(); paneRGroup.add(fL_R);
    const fR_R = fR.clone(); paneRGroup.add(fR_R);
    const fT_R = fT.clone(); paneRGroup.add(fT_R);
    const fB_R = fB.clone(); paneRGroup.add(fB_R);
    windowGroup.add(paneRGroup);

  } else if (style === 'awning') {
    // Top-hinged awning style window (swings outward)
    const insideW = w - borderWidth * 2;
    const insideH = h - borderWidth * 2;

    const glassAndInnerFrame = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.BoxGeometry(insideW, insideH, 0.01), glassMat);
    glassAndInnerFrame.add(glass);

    const innerB = 0.035;
    const fL = new THREE.Mesh(new THREE.BoxGeometry(innerB, insideH, 0.03), frameMat); fL.position.x = -insideW/2 + innerB/2; glassAndInnerFrame.add(fL);
    const fR = new THREE.Mesh(new THREE.BoxGeometry(innerB, insideH, 0.03), frameMat); fR.position.x = insideW/2 - innerB/2; glassAndInnerFrame.add(fR);
    const fT = new THREE.Mesh(new THREE.BoxGeometry(insideW, innerB, 0.03), frameMat); fT.position.y = insideH/2 - innerB/2; glassAndInnerFrame.add(fT);
    const fB = new THREE.Mesh(new THREE.BoxGeometry(insideW, innerB, 0.03), frameMat); fB.position.y = -insideH/2 + innerB/2; glassAndInnerFrame.add(fB);

    // Hinge at top
    const pivot = new THREE.Group();
    pivot.position.set(0, insideH / 2, 0);
    glassAndInnerFrame.position.set(0, -insideH / 2, 0);
    pivot.add(glassAndInnerFrame);
    pivot.rotation.x = -0.22; // Swing angle
    windowGroup.add(pivot);

    // Metal scissor rods
    const scissor = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.25), ironMat);
    scissor.rotation.x = Math.PI / 3;
    scissor.position.set(-insideW / 2 + 0.04, -insideH / 3, 0.08);
    windowGroup.add(scissor);
    const scissorR = scissor.clone();
    scissorR.position.x = insideW / 2 - 0.04;
    windowGroup.add(scissorR);

  } else if (style === 'modern_double') {
    const insideW = w - borderWidth * 2;
    const insideH = h - borderWidth * 2;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(insideW, insideH, 0.01), glassMat);
    windowGroup.add(glass);

    // Center vertical post
    const midBar = new THREE.Mesh(new THREE.BoxGeometry(borderWidth, insideH, d - 0.01), frameMat);
    windowGroup.add(midBar);

  } else if (style === 'traditional_double') {
    const insideW = w - borderWidth * 2;
    const insideH = h - borderWidth * 2;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(insideW, insideH, 0.01), glassMat);
    windowGroup.add(glass);

    const midBar = new THREE.Mesh(new THREE.BoxGeometry(borderWidth, insideH, d - 0.01), frameMat);
    windowGroup.add(midBar);

    // Grids for left half
    const gridW = (insideW - borderWidth) / 2;
    const divWidth = 0.012;

    const leftVert = new THREE.Mesh(new THREE.BoxGeometry(divWidth, insideH, d - 0.03), frameMat); leftVert.position.x = -insideW / 4; windowGroup.add(leftVert);
    const leftHor1 = new THREE.Mesh(new THREE.BoxGeometry(gridW, divWidth, d - 0.03), frameMat); leftHor1.position.set(-insideW / 4, insideH / 4, 0); windowGroup.add(leftHor1);
    const leftHor2 = leftHor1.clone(); leftHor2.position.y = -insideH / 4; windowGroup.add(leftHor2);

    // Grids for right half
    const rightVert = leftVert.clone(); rightVert.position.x = insideW / 4; windowGroup.add(rightVert);
    const rightHor1 = leftHor1.clone(); rightHor1.position.x = insideW / 4; windowGroup.add(rightHor1);
    const rightHor2 = leftHor2.clone(); rightHor2.position.y = -insideH / 4; rightHor2.position.x = insideW / 4; windowGroup.add(rightHor2);

  } else if (style === 'fixed_vertical') {
    // Dark aluminum minimal framing
    const darkFrame = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.9, roughness: 0.2 });
    bLeft.material = darkFrame;
    bRight.material = darkFrame;
    bTop.material = darkFrame;
    bBottom.material = darkFrame;

    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - borderWidth * 2, h - borderWidth * 2, 0.01), glassMat);
    windowGroup.add(glass);

  } else if (style === 'fixed_horizontal') {
    // Bronze color sleek frame
    const bronzeFrame = new THREE.MeshStandardMaterial({ color: 0x2b221d, metalness: 0.8, roughness: 0.3 });
    bLeft.material = bronzeFrame;
    bRight.material = bronzeFrame;
    bTop.material = bronzeFrame;
    bBottom.material = bronzeFrame;

    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - borderWidth * 2, h - borderWidth * 2, 0.01), glassMat);
    windowGroup.add(glass);
  }

  return windowGroup;
};

export const ThreeRoomViewer: React.FC<ThreeRoomViewerProps> = ({
  style,
  roomType,
  appliedRefinements,
  onApplyRefinement,
  onRoomTypeChange,
  isSidebarCollapsed = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [floorStyle, setFloorStyle] = useState('oak');
  const [wallColor, setWallColor] = useState('offwhite');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset' | 'night'>('day');
  const [customLampsOn, setCustomLampsOn] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<string>('sofa_or_bed');
  const [couchMaterial, setCouchMaterial] = useState<'fabric' | 'leather'>('fabric');
  const [plantAdded, setPlantAdded] = useState(false);
  const [floorLampAdded, setFloorLampAdded] = useState(false);
  const [artworkAdded, setArtworkAdded] = useState(false);
  const [wineCabinetAdded, setWineCabinetAdded] = useState(false);
  const [catTowerAdded, setCatTowerAdded] = useState(false);
  const [barCartAdded, setBarCartAdded] = useState(false);
  const [concreteWallAdded, setConcreteWallAdded] = useState(false);
  const [diffuserAdded, setDiffuserAdded] = useState(false);
  const [cushionsAdded, setCushionsAdded] = useState(roomType === RoomType.LIVING_ROOM);
  const [areaRugAdded, setAreaRugAdded] = useState(true);
  const [throwBlanketAdded, setThrowBlanketAdded] = useState(false);
  const [curtainsAdded, setCurtainsAdded] = useState(false);
  const [wallMirrorAdded, setWallMirrorAdded] = useState(false);
  const [tableLampAdded, setTableLampAdded] = useState(false);
  const [wardrobeAdded, setWardrobeAdded] = useState(false);
  const [vaseAdded, setVaseAdded] = useState(false);
  const [clockAdded, setClockAdded] = useState(false);
  const [shoeCabinetAdded, setShoeCabinetAdded] = useState(false);
  const [mushroomLampAdded, setMushroomLampAdded] = useState(false);
  const [vintageLampAdded, setVintageLampAdded] = useState(false);
  const [cantileverLampAdded, setCantileverLampAdded] = useState(false);
  const [retroSphereLampAdded, setRetroSphereLampAdded] = useState(false);
  const [turntableAdded, setTurntableAdded] = useState(false);
  const [sculptureAdded, setSculptureAdded] = useState(false);
  const [stackedBooksAdded, setStackedBooksAdded] = useState(false);
  const [botanicalPrintAdded, setBotanicalPrintAdded] = useState(false);
  const [abstractOilAdded, setAbstractOilAdded] = useState(false);
  const [japanInkAdded, setJapanInkAdded] = useState(false);
  const [lightTemperature, setLightTemperature] = useState<'white' | 'warmwhite' | 'warmyellow'>('warmwhite');
  const [ceilingLightStyle, setCeilingLightStyle] = useState<'flushmount' | 'modern' | 'scandinavian' | 'industrial' | 'luxury'>('flushmount');
  const [activePanelTab, setActivePanelTab] = useState<'layout' | 'materials' | 'furniture'>('furniture');
  const [selectedPresetTab, setSelectedPresetTab] = useState<'all' | 'core_furniture' | 'soft_furniture' | 'textiles' | 'lighting' | 'accents'>('all');

  // Core Furniture Visibility state variables (to make ALL default/initial furniture optional)
  const [livingSofaAdded, setLivingSofaAdded] = useState(true);
  const [livingCoffeeTableAdded, setLivingCoffeeTableAdded] = useState(true);
  const [livingTvConsoleAdded, setLivingTvConsoleAdded] = useState(true);

  const [bedroomBedAdded, setBedroomBedAdded] = useState(true);
  const [bedroomStandsAdded, setBedroomStandsAdded] = useState(true);

  const [diningSetAdded, setDiningSetAdded] = useState(true);
  const [diningSideboardAdded, setDiningSideboardAdded] = useState(true);

  const [officeDeskAdded, setOfficeDeskAdded] = useState(true);
  const [officeBookcaseAdded, setOfficeBookcaseAdded] = useState(true);

  const [bathroomBathtubAdded, setBathroomBathtubAdded] = useState(true);
  const [bathroomVanityAdded, setBathroomVanityAdded] = useState(true);
  const [bathroomToiletAdded, setBathroomToiletAdded] = useState(true);
  const [bathroomShowerAdded, setBathroomShowerAdded] = useState(true); // default true for bathroom shower faucet and showerhead!

  const [kitchenCounterAdded, setKitchenCounterAdded] = useState(true);
  const [kitchenFridgeAdded, setKitchenFridgeAdded] = useState(true);

  const [studioBedAdded, setStudioBedAdded] = useState(false);
  const [studioDeskAdded, setStudioDeskAdded] = useState(true);
  const [studioWardrobeAdded, setStudioWardrobeAdded] = useState(true);

  // Presets and Overlays states for non-destructive toggle
  const [leatherPresetActive, setLeatherPresetActive] = useState(false);
  const [herringbonePresetActive, setHerringbonePresetActive] = useState(false);
  const [ceilingLightPresetStyle, setCeilingLightPresetStyle] = useState<'modern' | 'scandinavian' | 'industrial' | 'luxury' | null>(null);

  // New door, window, floor and wall customization states
  const [doorStyle, setDoorStyle] = useState('modern');
  const [doorPosition, setDoorPosition] = useState('right');
  const [doorOffset, setDoorOffset] = useState(0.8);
  const [doorColor, setDoorColor] = useState('#e5e5e5');
  
  const [windowStyle, setWindowStyle] = useState('modern_single');
  const [windowPosition, setWindowPosition] = useState('left');
  const [windowOffset, setWindowOffset] = useState(-0.4);
  const [windowHeight, setWindowHeight] = useState(1.4);
  const [windowWidth, setWindowWidth] = useState(1.1);

  const [floorRoughness, setFloorRoughness] = useState(0.6);
  const [floorTiling, setFloorTiling] = useState(1.0);
  const [wallMaterialType, setWallMaterialType] = useState('paint');
  const [wallCustomColor, setWallCustomColor] = useState('#faf9f6');
  const [wallUseCustomColor, setWallUseCustomColor] = useState(false);
  const [wallAccentEnabled, setWallAccentEnabled] = useState(false);
  const [wallAccentColor, setWallAccentColor] = useState('#8f9779');

  // Sync floor roughness with preset selections internally too
  useEffect(() => {
    const selected = FLOOR_TYPES.find(f => f.id === floorStyle);
    if (selected) {
      setFloorRoughness(selected.roughness);
    }
  }, [floorStyle]);

  // Synchronize 3D sandbox room visual elements (floors, walls, lighting, textures) when user changes selected design style
  useEffect(() => {
    switch (style) {
      case DesignStyle.MODERN:
        setFloorStyle('walnut');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('leather');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
      case DesignStyle.MINIMALIST:
        setFloorStyle('oak');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('fabric');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
      case DesignStyle.SCANDINAVIAN:
        setFloorStyle('herringbone');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('fabric');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
      case DesignStyle.INDUSTRIAL:
        setFloorStyle('concrete');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('leather');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
      case DesignStyle.MID_CENTURY_MODERN:
        setFloorStyle('walnut');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('leather');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
      case DesignStyle.LUXURY:
        setFloorStyle('marble');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('leather');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
      case DesignStyle.BOHEMIAN:
        setFloorStyle('terrazzo');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('fabric');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
      case DesignStyle.JAPANDI:
        setFloorStyle('oak');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('fabric');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
      case DesignStyle.COASTAL:
        setFloorStyle('carpet');
        setWallColor('offwhite');
        setWallMaterialType('paint');
        setWallUseCustomColor(false);
        setWallAccentEnabled(false);
        setCouchMaterial('fabric');
        setTimeOfDay('day');
        setConcreteWallAdded(false);
        break;
    }
  }, [style]);

  // Custom room size in centimeters (Length * Width / Height)
  // Default values requested: Width = 500 cm, Length = 400 cm, Height = 260 cm
  const [roomWidth, setRoomWidth] = useState(500);   // X-axis (Width): 5.0m
  const [roomLength, setRoomLength] = useState(400);  // Z-axis (Length): 4.0m
  const [roomHeight, setRoomHeight] = useState(260);  // Y-axis (Height): 2.6m

  const [sofaType, setSofaType] = useState<'three' | 'two' | 'l_shape'>('three');
  const [bedType, setBedType] = useState<'double' | 'single'>('double');

  // Layout positions (offsets in X, Y, Z, or rotation)
  const [furnitureX, setFurnitureX] = useState(0);
  const [furnitureY, setFurnitureY] = useState(0);
  const [furnitureZ, setFurnitureZ] = useState(1.47); // default sofa placement offset
  const [furnitureRot, setFurnitureRot] = useState(Math.PI); // default sofa rotation so it backs against the wall and faces the TV
  const [furnitureScale, setFurnitureScale] = useState(1);

  // Per-room state history to maintain structural, materials, and furniture adjustments independently
  const roomHistoryRef = useRef<Record<string, any>>({});
  const lastStyleRef = useRef(style);
  const lastRoomTypeRef = useRef(roomType);

  const currentStatesRef = useRef<any>({});
  currentStatesRef.current = {
    floorStyle,
    wallColor,
    timeOfDay,
    customLampsOn,
    selectedFurniture,
    couchMaterial,
    sofaType,
    bedType,
    plantAdded,
    floorLampAdded,
    artworkAdded,
    wineCabinetAdded,
    catTowerAdded,
    barCartAdded,
    concreteWallAdded,
    diffuserAdded,
    cushionsAdded,
    areaRugAdded,
    throwBlanketAdded,
    curtainsAdded,
    wallMirrorAdded,
    tableLampAdded,
    wardrobeAdded,
    vaseAdded,
    clockAdded,
    shoeCabinetAdded,
    mushroomLampAdded,
    vintageLampAdded,
    cantileverLampAdded,
    retroSphereLampAdded,
    turntableAdded,
    sculptureAdded,
    stackedBooksAdded,
    botanicalPrintAdded,
    abstractOilAdded,
    japanInkAdded,
    lightTemperature,
    ceilingLightStyle,
    livingSofaAdded,
    livingCoffeeTableAdded,
    livingTvConsoleAdded,
    bedroomBedAdded,
    bedroomStandsAdded,
    diningSetAdded,
    diningSideboardAdded,
    officeDeskAdded,
    officeBookcaseAdded,
    bathroomBathtubAdded,
    bathroomVanityAdded,
    bathroomToiletAdded,
    bathroomShowerAdded,
    kitchenCounterAdded,
    kitchenFridgeAdded,
    studioBedAdded,
    studioDeskAdded,
    studioWardrobeAdded,
    leatherPresetActive,
    herringbonePresetActive,
    ceilingLightPresetStyle,
    doorStyle,
    doorPosition,
    doorOffset,
    doorColor,
    windowStyle,
    windowPosition,
    windowOffset,
    windowHeight,
    windowWidth,
    floorRoughness,
    floorTiling,
    wallMaterialType,
    wallCustomColor,
    wallUseCustomColor,
    wallAccentEnabled,
    wallAccentColor,
    roomWidth,
    roomLength,
    roomHeight,
    furnitureX,
    furnitureY,
    furnitureZ,
    furnitureRot,
    furnitureScale
  };

  // Reset per-space history when the overall design style preset changes, so each room adapts fresh design presets
  useEffect(() => {
    if (lastStyleRef.current !== style) {
      roomHistoryRef.current = {};
      lastStyleRef.current = style;
    }
  }, [style]);

  // Synchronize (Load/Save) configurations per roomType when switching spaces
  useEffect(() => {
    const prevRoomType = lastRoomTypeRef.current;
    if (prevRoomType !== roomType) {
      // 1. Save the previous room's configuration snapshot
      const snapshot = { ...currentStatesRef.current };
      roomHistoryRef.current[prevRoomType] = snapshot;

      // 2. Load the target room's configuration if it was already modified and saved
      const saved = roomHistoryRef.current[roomType];
      if (saved) {
        if (saved.floorStyle !== undefined) setFloorStyle(saved.floorStyle);
        if (saved.wallColor !== undefined) setWallColor(saved.wallColor);
        if (saved.timeOfDay !== undefined) setTimeOfDay(saved.timeOfDay);
        if (saved.customLampsOn !== undefined) setCustomLampsOn(saved.customLampsOn);
        if (saved.selectedFurniture !== undefined) setSelectedFurniture(saved.selectedFurniture);
        if (saved.couchMaterial !== undefined) setCouchMaterial(saved.couchMaterial);
        if (saved.sofaType !== undefined) setSofaType(saved.sofaType);
        if (saved.bedType !== undefined) setBedType(saved.bedType);
        if (saved.plantAdded !== undefined) setPlantAdded(saved.plantAdded);
        if (saved.floorLampAdded !== undefined) setFloorLampAdded(saved.floorLampAdded);
        if (saved.artworkAdded !== undefined) setArtworkAdded(saved.artworkAdded);
        if (saved.wineCabinetAdded !== undefined) setWineCabinetAdded(saved.wineCabinetAdded);
        if (saved.catTowerAdded !== undefined) setCatTowerAdded(saved.catTowerAdded);
        if (saved.barCartAdded !== undefined) setBarCartAdded(saved.barCartAdded);
        if (saved.concreteWallAdded !== undefined) setConcreteWallAdded(saved.concreteWallAdded);
        if (saved.diffuserAdded !== undefined) setDiffuserAdded(saved.diffuserAdded);
        if (saved.cushionsAdded !== undefined) setCushionsAdded(saved.cushionsAdded);
        if (saved.areaRugAdded !== undefined) setAreaRugAdded(saved.areaRugAdded);
        if (saved.throwBlanketAdded !== undefined) setThrowBlanketAdded(saved.throwBlanketAdded);
        if (saved.curtainsAdded !== undefined) setCurtainsAdded(saved.curtainsAdded);
        if (saved.wallMirrorAdded !== undefined) setWallMirrorAdded(saved.wallMirrorAdded);
        if (saved.tableLampAdded !== undefined) setTableLampAdded(saved.tableLampAdded);
        if (saved.wardrobeAdded !== undefined) setWardrobeAdded(saved.wardrobeAdded);
        if (saved.vaseAdded !== undefined) setVaseAdded(saved.vaseAdded);
        if (saved.clockAdded !== undefined) setClockAdded(saved.clockAdded);
        if (saved.shoeCabinetAdded !== undefined) setShoeCabinetAdded(saved.shoeCabinetAdded);
        if (saved.mushroomLampAdded !== undefined) setMushroomLampAdded(saved.mushroomLampAdded);
        if (saved.vintageLampAdded !== undefined) setVintageLampAdded(saved.vintageLampAdded);
        if (saved.cantileverLampAdded !== undefined) setCantileverLampAdded(saved.cantileverLampAdded);
        if (saved.retroSphereLampAdded !== undefined) setRetroSphereLampAdded(saved.retroSphereLampAdded);
        if (saved.turntableAdded !== undefined) setTurntableAdded(saved.turntableAdded);
        if (saved.sculptureAdded !== undefined) setSculptureAdded(saved.sculptureAdded);
        if (saved.stackedBooksAdded !== undefined) setStackedBooksAdded(saved.stackedBooksAdded);
        if (saved.botanicalPrintAdded !== undefined) setBotanicalPrintAdded(saved.botanicalPrintAdded);
        if (saved.abstractOilAdded !== undefined) setAbstractOilAdded(saved.abstractOilAdded);
        if (saved.japanInkAdded !== undefined) setJapanInkAdded(saved.japanInkAdded);
        if (saved.lightTemperature !== undefined) setLightTemperature(saved.lightTemperature);
        if (saved.ceilingLightStyle !== undefined) setCeilingLightStyle(saved.ceilingLightStyle);
        
        if (saved.livingSofaAdded !== undefined) setLivingSofaAdded(saved.livingSofaAdded);
        if (saved.livingCoffeeTableAdded !== undefined) setLivingCoffeeTableAdded(saved.livingCoffeeTableAdded);
        if (saved.livingTvConsoleAdded !== undefined) setLivingTvConsoleAdded(saved.livingTvConsoleAdded);
        
        if (saved.bedroomBedAdded !== undefined) setBedroomBedAdded(saved.bedroomBedAdded);
        if (saved.bedroomStandsAdded !== undefined) setBedroomStandsAdded(saved.bedroomStandsAdded);
        
        if (saved.diningSetAdded !== undefined) setDiningSetAdded(saved.diningSetAdded);
        if (saved.diningSideboardAdded !== undefined) setDiningSideboardAdded(saved.diningSideboardAdded);
        
        if (saved.officeDeskAdded !== undefined) setOfficeDeskAdded(saved.officeDeskAdded);
        if (saved.officeBookcaseAdded !== undefined) setOfficeBookcaseAdded(saved.officeBookcaseAdded);
        
        if (saved.bathroomBathtubAdded !== undefined) setBathroomBathtubAdded(saved.bathroomBathtubAdded);
        if (saved.bathroomVanityAdded !== undefined) setBathroomVanityAdded(saved.bathroomVanityAdded);
        if (saved.bathroomToiletAdded !== undefined) setBathroomToiletAdded(saved.bathroomToiletAdded);
        if (saved.bathroomShowerAdded !== undefined) setBathroomShowerAdded(saved.bathroomShowerAdded);
        
        if (saved.kitchenCounterAdded !== undefined) setKitchenCounterAdded(saved.kitchenCounterAdded);
        if (saved.kitchenFridgeAdded !== undefined) setKitchenFridgeAdded(saved.kitchenFridgeAdded);
        
        if (saved.studioBedAdded !== undefined) setStudioBedAdded(saved.studioBedAdded);
        if (saved.studioDeskAdded !== undefined) setStudioDeskAdded(saved.studioDeskAdded);
        if (saved.studioWardrobeAdded !== undefined) setStudioWardrobeAdded(saved.studioWardrobeAdded);
        
        if (saved.leatherPresetActive !== undefined) setLeatherPresetActive(saved.leatherPresetActive);
        if (saved.herringbonePresetActive !== undefined) setHerringbonePresetActive(saved.herringbonePresetActive);
        if (saved.ceilingLightPresetStyle !== undefined) setCeilingLightPresetStyle(saved.ceilingLightPresetStyle);
        
        if (saved.doorStyle !== undefined) setDoorStyle(saved.doorStyle);
        if (saved.doorPosition !== undefined) setDoorPosition(saved.doorPosition);
        if (saved.doorOffset !== undefined) setDoorOffset(saved.doorOffset);
        if (saved.doorColor !== undefined) setDoorColor(saved.doorColor);
        
        if (saved.windowStyle !== undefined) setWindowStyle(saved.windowStyle);
        if (saved.windowPosition !== undefined) setWindowPosition(saved.windowPosition);
        if (saved.windowOffset !== undefined) setWindowOffset(saved.windowOffset);
        if (saved.windowHeight !== undefined) setWindowHeight(saved.windowHeight);
        if (saved.windowWidth !== undefined) setWindowWidth(saved.windowWidth);
        
        if (saved.floorRoughness !== undefined) setFloorRoughness(saved.floorRoughness);
        if (saved.floorTiling !== undefined) setFloorTiling(saved.floorTiling);
        if (saved.wallMaterialType !== undefined) setWallMaterialType(saved.wallMaterialType);
        if (saved.wallCustomColor !== undefined) setWallCustomColor(saved.wallCustomColor);
        if (saved.wallUseCustomColor !== undefined) setWallUseCustomColor(saved.wallUseCustomColor);
        if (saved.wallAccentEnabled !== undefined) setWallAccentEnabled(saved.wallAccentEnabled);
        if (saved.wallAccentColor !== undefined) setWallAccentColor(saved.wallAccentColor);
        
        if (saved.roomWidth !== undefined) setRoomWidth(saved.roomWidth);
        if (saved.roomLength !== undefined) setRoomLength(saved.roomLength);
        if (saved.roomHeight !== undefined) setRoomHeight(saved.roomHeight);
        
        if (saved.furnitureX !== undefined) setFurnitureX(saved.furnitureX);
        if (saved.furnitureY !== undefined) setFurnitureY(saved.furnitureY);
        if (saved.furnitureZ !== undefined) setFurnitureZ(saved.furnitureZ);
        if (saved.furnitureRot !== undefined) setFurnitureRot(saved.furnitureRot);
        if (saved.furnitureScale !== undefined) setFurnitureScale(saved.furnitureScale);
      } else {
        // If entering a room type for the first time without history,
        // reset sliders & positions to match default coordinates for the active furniture in that space.
        // Also reset all decorative items individually so each room starts clean with its own decor setup!
        setFloorStyle('oak');
        setWallColor('white');
        setCustomLampsOn(false);
        setPlantAdded(false);
        setFloorLampAdded(false);
        setArtworkAdded(false);
        setWineCabinetAdded(false);
        setCatTowerAdded(false);
        setBarCartAdded(false);
        setConcreteWallAdded(false);
        setDiffuserAdded(false);
        setCushionsAdded(roomType === RoomType.LIVING_ROOM);
        setAreaRugAdded(true);
        setThrowBlanketAdded(false);
        setCurtainsAdded(false);
        setWallMirrorAdded(false);
        setTableLampAdded(false);
        setWardrobeAdded(false);
        setVaseAdded(false);
        setClockAdded(false);
        setShoeCabinetAdded(false);
        setMushroomLampAdded(false);
        setVintageLampAdded(false);
        setCantileverLampAdded(false);
        setRetroSphereLampAdded(false);
        setTurntableAdded(false);
        setSculptureAdded(false);
        setStackedBooksAdded(false);
        setBotanicalPrintAdded(false);
        setAbstractOilAdded(false);
        setJapanInkAdded(false);
        setLeatherPresetActive(false);
        setHerringbonePresetActive(false);
        setCeilingLightPresetStyle(null);

        const defaultFurniture = 'sofa_or_bed';
        setSelectedFurniture(defaultFurniture);
        const defaults = getFurnitureDefaults(roomType, defaultFurniture);
        if (defaults) {
          setFurnitureX(defaults.x);
          setFurnitureY(0);
          setFurnitureZ(defaults.z);
          setFurnitureRot(defaults.rot);
          setFurnitureScale(defaults.scale);
        }
      }

      lastRoomTypeRef.current = roomType;

      // Automatically reset camera view to standard optimal framing/perspective with a safety timeout
      const timer = setTimeout(() => {
        adjustCameraView('orbit');
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [roomType]);

  // Helper to get furniture coordinates defaults based on RoomType & Furniture ID
  const getFurnitureDefaults = (rType: RoomType, item: string) => {
    const rW = roomWidth / 100;
    const rD = roomLength / 100;
    switch (rType) {
      case RoomType.LIVING_ROOM:
        if (item === 'sofa_or_bed') return { x: 0, z: rD / 2 - 0.53, rot: Math.PI, scale: 1 };
        if (item === 'coffee_table') return { x: 0, z: rD / 2 - 1.50, rot: 0, scale: 1 };
        if (item === 'tv_console') return { x: 0, z: -rD / 2 + 0.25, rot: 0, scale: 1 };
        break;
      case RoomType.BEDROOM:
        if (item === 'sofa_or_bed') return { x: 0, z: -rD / 2 + 1.25, rot: 0, scale: 1 };
        if (item === 'stands') return { x: 0, z: -rD / 2 + 1.25, rot: 0, scale: 1 };
        if (item === 'wardrobe') return { x: -1.85, z: 1.22, rot: 86 * Math.PI / 180, scale: 1 };
        break;
      case RoomType.DINING_ROOM:
        if (item === 'sofa_or_bed') return { x: 0, z: 0.1, rot: 0, scale: 1 };
        if (item === 'sideboard') return { x: 0, z: -rD / 2 + 0.28, rot: 0, scale: 1 };
        break;
      case RoomType.OFFICE:
        if (item === 'sofa_or_bed') return { x: 0, z: 0.32, rot: 0, scale: 1 };
        if (item === 'bookcase') return { x: 0, z: -rD / 2 + 0.22, rot: 0, scale: 1 };
        break;
      case RoomType.BATHROOM:
        if (item === 'sofa_or_bed') return { x: -rW / 2 + 1.1, z: 0.32, rot: 0, scale: 1 };
        if (item === 'vanity') return { x: 0.4, z: -rD / 2 + 0.32, rot: 0, scale: 1 };
        if (item === 'toilet') return { x: rW / 2 - 0.65, z: -rD / 2 + 0.25, rot: 0, scale: 1 };
        break;
      case RoomType.KITCHEN:
        if (item === 'sofa_or_bed') return { x: 0, z: -rD / 2 + 0.33, rot: 0, scale: 1 };
        if (item === 'fridge') return { x: rW / 2 - 0.48, z: -0.3, rot: -Math.PI / 2, scale: 1 };
        break;
      case RoomType.STUDIO:
        if (item === 'sofa_or_bed') return { x: -rW / 2 + 1.15, z: -rD / 2 + 1.25, rot: 0, scale: 1 };
        if (item === 'studio_sofa') return { x: -rW / 2 + 1.15, z: rD / 2 - 0.85, rot: Math.PI, scale: 1 };
        if (item === 'coffee_table') return { x: rW / 2 - 0.75, z: -rD / 2 + 0.55, rot: 0, scale: 1 };
        break;
    }
    if (item === 'accent_plant') {
      return { x: -rW / 2 + 0.6, z: rD / 2 - 0.6, rot: 0, scale: 1 };
    }
    if (item === 'accent_artwork') {
      return { x: 0, z: -rD / 2 + 0.025, rot: 0, scale: 1 };
    }
    if (item === 'wardrobe') {
      return { x: -rW / 2 + 0.65, z: rD / 2 - 0.35, rot: 0, scale: 1 };
    }
    if (item === 'botanical_print') {
      return { x: -rW / 4, z: -rD / 2 + 0.025, rot: 0, scale: 1 };
    }
    if (item === 'abstract_oil') {
      return { x: rW / 4, z: -rD / 2 + 0.025, rot: 0, scale: 1 };
    }
    if (item === 'japan_ink') {
      return { x: 0, z: rD / 2 - 0.025, rot: Math.PI, scale: 1 };
    }
    if (item === 'wine_cabinet') {
      return { x: rW / 2 - 0.4, z: -rD / 2 + 0.8, rot: -Math.PI / 2, scale: 1 };
    }
    if (item === 'cat_tower') {
      return { x: rW / 2 - 0.7, z: rD / 2 - 0.7, rot: 0, scale: 1 };
    }
    if (item === 'bar_cart') {
      return { x: -rW / 2 + 0.8, z: rD / 2 - 1.2, rot: 0, scale: 1 };
    }
    if (item === 'accent_lamp') {
      return { x: rW / 2 - 0.25, z: rD / 2 - 0.4, rot: -Math.PI * 0.75, scale: 1 };
    }
    if (item === 'diffuser') {
      return { x: -rW / 2 + 1.45, z: rD / 2 - 1.1, rot: 0, scale: 1 };
    }
    if (item === 'cushions') {
      return {
        x: 0,
        z: rType === RoomType.LIVING_ROOM ? rD / 2 - 0.53 : -rD / 2 + 1.23,
        rot: rType === RoomType.LIVING_ROOM ? Math.PI : 0,
        scale: 1
      };
    }
    if (item === 'throw_blanket') {
      const isLivingRoomThrow = rType === RoomType.LIVING_ROOM;
      const bedThrowX = rType === RoomType.STUDIO ? -rW / 2 + 1.15 : 0;
      return {
        x: isLivingRoomThrow ? (sofaType === 'l_shape' ? 0.78 : -0.58) : bedThrowX,
        z: isLivingRoomThrow ? (sofaType === 'l_shape' ? rD / 2 - 0.98 : rD / 2 - 0.72) : -rD / 2 + 1.84,
        rot: isLivingRoomThrow ? Math.PI : 0,
        scale: 1
      };
    }
    if (item === 'wall_mirror') {
      return { x: rW / 2 - 1.05, z: -rD / 2 + 0.028, rot: 0, scale: 1 };
    }
    if (item === 'table_lamp') {
      return { x: -rW / 2 + 0.95, z: rD / 2 - 1.1, rot: 0, scale: 1 };
    }
    if (item === 'vase') {
      return { x: -0.4, z: 0.1, rot: 0, scale: 1 };
    }
    if (item === 'clock') {
      return { x: -1.1, z: -rD / 2 + 0.025, rot: 0, scale: 1 };
    }
    if (item === 'shoe_cabinet') {
      return { x: rW / 2 - 0.35, z: rD / 2 - 1.0, rot: -Math.PI / 2, scale: 1 };
    }
    if (item === 'mushroom_lamp') {
      return { x: 0.8, z: 0.35, rot: 0, scale: 1 };
    }
    if (item === 'vintage_lamp') {
      return { x: -0.8, z: 0.35, rot: 0, scale: 1 };
    }
    if (item === 'cantilever_lamp') {
      return { x: -rW / 2 + 0.45, z: rD / 2 - 0.45, rot: 0, scale: 1 };
    }
    if (item === 'retro_sphere_lamp') {
      return { x: rW / 2 - 0.45, z: -rD / 2 + 0.45, rot: 0, scale: 1 };
    }
    if (item === 'turntable') {
      return { x: 0.35, z: -0.35, rot: 0, scale: 1 };
    }
    if (item === 'sculpture') {
      return { x: -0.25, z: 0.55, rot: 0, scale: 1 };
    }
    if (item === 'stacked_books') {
      return { x: 0.15, z: 0.55, rot: 0, scale: 1 };
    }
    return { x: 0, z: 0, rot: 0, scale: 1 };
  };

  // Helper to get safe horizontal/vertical movement bounds of selected furniture to avoid wall penetration and flickering
  const getFurnitureBounds = (rType: RoomType, item: string) => {
    const rW = roomWidth / 100;
    const rD = roomLength / 100;
    
    // Default safe cushion padding
    let padX = 0.45;
    let padZ = 0.45;
    const buffer = 0.05; // 5cm air cushion to prevent exact contact face-matching (Z-fighting)

    if (item === 'sofa_or_bed') {
      if (rType === RoomType.LIVING_ROOM) {
        // Living room sofa (width: 3.0m, depth: 0.9m). Default rot: Math.PI (180 deg)
        // With Math.PI rotation, world X extends from -1.5 to 1.5, requiring min/max padding of 1.5 + buffer.
        // Back of backrest (critical area back of sofa) extends to local Z = -0.48.
        // Front seat extends to local Z = +0.4.
        // Rotated Math.PI: Backrest in world is in positive Z direction (Z <= rD/2 - 0.48 - buffer).
        // Front seat in world is in negative Z direction (Z >= -rD/2 + 0.40 + buffer).
        return {
          minX: -rW / 2 + 1.50 + buffer,
          maxX: rW / 2 - 1.50 - buffer,
          minZ: -rD / 2 + 0.40 + buffer,
          maxZ: rD / 2 - 0.48 - buffer,
        };
      } else if (rType === RoomType.BEDROOM) {
        // Bedroom bed (width: 2.1m, depth: 1.9m). Default rot: 0 (facing forward)
        // Local X is -1.05 to 1.05. PadX = 1.05 + buffer
        // Local Z backmost (headboard back) is at -1.0. Frontmost is at +1.0.
        // World coordinates match local because of 0 rotation.
        // Backmost >= -rD/2 => Z >= -rD/2 + 1.0 + buffer.
        // Frontmost <= rD/2 => Z <= rD/2 - 1.0 - buffer.
        return {
          minX: -rW / 2 + 1.05 + buffer,
          maxX: rW / 2 - 1.05 - buffer,
          minZ: -rD / 2 + 1.00 + buffer,
          maxZ: rD / 2 - 1.00 - buffer,
        };
      }
    } else if (item === 'stands' && rType === RoomType.BEDROOM) {
      // Bedside nightstands: centered at standOffset left and right
      const offset = Math.min(1.42, rW / 2 - 0.35);
      const wPad = offset + 0.25 + buffer; // stands have 0.5m width
      // Local Z spans from -1.125 (back of stands) to -0.675 (front of stands).
      // Backmost >= -rD/2 => Z - 1.125 >= -rD/2 => Z >= -rD/2 + 1.125 + buffer
      // Frontmost <= rD/2 => Z - 0.675 <= rD/2 => Z <= rD/2 + 0.675 - buffer
      return {
        minX: -rW / 2 + wPad,
        maxX: rW / 2 - wPad,
        minZ: -rD / 2 + 1.125 + buffer,
        maxZ: rD / 2 + 0.675 - buffer
      };
    } else if (item === 'coffee_table') {
      // width: 1.2, depth: 0.6
      padX = 0.60 + buffer;
      padZ = 0.30 + buffer;
    } else if (item === 'tv_console') {
      // width: 2.0, depth: 0.45
      padX = 1.00 + buffer;
      padZ = 0.20 + buffer;
    } else if (item === 'sideboard') {
      // width: 1.8, depth: 0.50
      padX = 0.90 + buffer;
      padZ = 0.25 + buffer;
    } else if (item === 'bookcase') {
      // width: 1.2, depth: 0.40
      padX = 0.60 + buffer;
      padZ = 0.20 + buffer;
    } else if (item === 'vanity') {
      // width: 1.0, depth: 0.50
      padX = 0.50 + buffer;
      padZ = 0.25 + buffer;
    } else if (item === 'toilet') {
      // width: 0.6, depth: 0.8
      padX = 0.30 + buffer;
      padZ = 0.20 + buffer;
    } else if (item === 'fridge') {
      // width: 0.9, depth: 0.9
      padX = 0.45 + buffer;
      padZ = 0.45 + buffer;
    } else if (item === 'studio_sofa') {
      // width: 2.0, depth: 0.90
      padX = 1.00 + buffer;
      padZ = 0.45 + buffer;
    } else if (item === 'accent_plant') {
      // width: 0.7, depth: 0.7
      padX = 0.35 + buffer;
      padZ = 0.35 + buffer;
    } else if (item === 'accent_artwork' || item === 'botanical_print' || item === 'abstract_oil' || item === 'japan_ink') {
      padX = 0.70 + buffer;
      padZ = 0.05 + buffer;
    } else if (item === 'wine_cabinet') {
      // width: 0.7, depth: 0.42
      padX = 0.35 + buffer;
      padZ = 0.21 + buffer;
    } else if (item === 'cat_tower') {
      // width: 0.56, depth: 0.56
      padX = 0.28 + buffer;
      padZ = 0.28 + buffer;
    } else if (item === 'bar_cart') {
      // width: 0.55, depth: 0.38
      padX = 0.275 + buffer;
      padZ = 0.19 + buffer;
    } else if (item === 'accent_lamp') {
      // width: 0.4, depth: 0.4
      padX = 0.20 + buffer;
      padZ = 0.20 + buffer;
    } else if (item === 'cushions') {
      padX = 0.75 + buffer;
      padZ = 0.20 + buffer;
    } else if (item === 'throw_blanket') {
      padX = 0.40 + buffer;
      padZ = 0.30 + buffer;
    } else if (item === 'wall_mirror') {
      padX = 0.34 + buffer;
      padZ = 0.035 + buffer;
    } else if (item === 'wardrobe') {
      // width: 1.2m, depth: 0.58m
      const absCos = Math.abs(Math.cos(furnitureRot));
      const absSin = Math.abs(Math.sin(furnitureRot));
      padX = (0.60 * absCos + 0.29 * absSin) + buffer;
      padZ = (0.29 * absCos + 0.60 * absSin) + buffer;
    } else if (item === 'vase') {
      // width: 0.2m, depth: 0.2m
      padX = 0.10 + buffer;
      padZ = 0.10 + buffer;
    } else if (item === 'clock') {
      // width: 0.48m, depth: 0.05m
      padX = 0.24 + buffer;
      padZ = 0.025 + buffer;
    } else if (item === 'shoe_cabinet') {
      // width: 0.88m, depth: 0.40m
      const absCos = Math.abs(Math.cos(furnitureRot));
      const absSin = Math.abs(Math.sin(furnitureRot));
      padX = (0.44 * absCos + 0.20 * absSin) + buffer;
      padZ = (0.20 * absCos + 0.44 * absSin) + buffer;
    } else if (item === 'mushroom_lamp') {
      padX = 0.125 + buffer;
      padZ = 0.125 + buffer;
    } else if (item === 'vintage_lamp') {
      padX = 0.12 + buffer;
      padZ = 0.12 + buffer;
    } else if (item === 'cantilever_lamp') {
      padX = 0.20 + buffer;
      padZ = 0.20 + buffer;
    } else if (item === 'retro_sphere_lamp') {
      padX = 0.20 + buffer;
      padZ = 0.20 + buffer;
    } else if (item === 'turntable') {
      padX = 0.18 + buffer;
      padZ = 0.18 + buffer;
    } else if (item === 'sculpture') {
      padX = 0.15 + buffer;
      padZ = 0.15 + buffer;
    } else if (item === 'stacked_books') {
      padX = 0.15 + buffer;
      padZ = 0.15 + buffer;
    }

    const defaults = getFurnitureDefaults(rType, item);

    const calculatedMinX = -rW / 2 + padX;
    const calculatedMaxX = rW / 2 - padX;
    const calculatedMinZ = -rD / 2 + padZ;
    const calculatedMaxZ = rD / 2 - padZ;

    return {
      minX: Math.min(calculatedMinX, calculatedMaxX, defaults.x),
      maxX: Math.max(calculatedMinX, calculatedMaxX, defaults.x),
      minZ: Math.min(calculatedMinZ, calculatedMaxZ, defaults.z),
      maxZ: Math.max(calculatedMinZ, calculatedMaxZ, defaults.z),
    };
  };

  // Auto-constrain furniture to stay inside custombounds nicely
  useEffect(() => {
    const bounds = getFurnitureBounds(roomType, selectedFurniture);
    const minX = Math.min(bounds.minX, bounds.maxX);
    const maxX = Math.max(bounds.minX, bounds.maxX);
    const minZ = Math.min(bounds.minZ, bounds.maxZ);
    const maxZ = Math.max(bounds.minZ, bounds.maxZ);

    setFurnitureX(prev => Math.max(minX, Math.min(maxX, prev || 0)));
    setFurnitureZ(prev => Math.max(minZ, Math.min(maxZ, prev || 0)));
  }, [roomWidth, roomLength, selectedFurniture, roomType, furnitureRot]);

  // Synchronize sliders to target furniture defaults
  const syncSlidersToDefault = (rType: RoomType, item: string) => {
    const defaults = getFurnitureDefaults(rType, item);
    setFurnitureX(defaults.x);
    setFurnitureY(0); // Reset Y-axis offset to 0
    setFurnitureZ(defaults.z);
    setFurnitureRot(defaults.rot);
    setFurnitureScale(defaults.scale);
  };

  // Synchronized via main room-switching hook


  // Keep references to 3D elements for live updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const wallsGroupRef = useRef<THREE.Group | null>(null);
  const lightingGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const processedRefinementsRef = useRef<Set<string>>(new Set());

  // Helper to query if a preset is active
  const getIsPresetActive = (key: string): boolean => {
    switch (key) {
      case 'leather': return leatherPresetActive;
      case 'floor': return herringbonePresetActive;
      case 'lamp': return floorLampAdded;
      case 'plant': return plantAdded;
      case 'art': return artworkAdded;
      case 'wine_cabinet': return wineCabinetAdded;
      case 'cat_tower': return catTowerAdded;
      case 'bar_cart': return barCartAdded;
      case 'concrete': return concreteWallAdded;
      case 'diffuser': return diffuserAdded;
      case 'cushions': return cushionsAdded;
      case 'area_rug': return areaRugAdded;
      case 'throw_blanket': return throwBlanketAdded;
      case 'curtains': return curtainsAdded;
      case 'wall_mirror': return wallMirrorAdded;
      case 'table_lamp': return tableLampAdded;
      case 'wardrobe': return wardrobeAdded;
      case 'vase': return vaseAdded;
      case 'clock': return clockAdded;
      case 'shoe_cabinet': return shoeCabinetAdded;
      case 'mushroom_lamp': return mushroomLampAdded;
      case 'vintage_lamp': return vintageLampAdded;
      case 'cantilever_lamp': return cantileverLampAdded;
      case 'retro_sphere_lamp': return retroSphereLampAdded;
      case 'turntable': return turntableAdded;
      case 'sculpture': return sculptureAdded;
      case 'stacked_books': return stackedBooksAdded;
      case 'botanical_print': return botanicalPrintAdded;
      case 'abstract_oil': return abstractOilAdded;
      case 'japan_ink': return japanInkAdded;
      case 'ceiling_modern': return ceilingLightPresetStyle === 'modern';
      case 'ceiling_scandi': return ceilingLightPresetStyle === 'scandinavian';
      case 'ceiling_industrial': return ceilingLightPresetStyle === 'industrial';
      case 'ceiling_luxury': return ceilingLightPresetStyle === 'luxury';
      
      // Core Furniture cases
      case 'living_sofa': return livingSofaAdded;
      case 'living_coffee_table': return livingCoffeeTableAdded;
      case 'living_tv_console': return livingTvConsoleAdded;
      case 'bedroom_bed': return bedroomBedAdded;
      case 'bedroom_stands': return bedroomStandsAdded;
      case 'dining_set': return diningSetAdded;
      case 'dining_sideboard': return diningSideboardAdded;
      case 'office_desk': return officeDeskAdded;
      case 'office_bookcase': return officeBookcaseAdded;
      case 'bathroom_bathtub': return bathroomBathtubAdded;
      case 'bathroom_vanity': return bathroomVanityAdded;
      case 'bathroom_toilet': return bathroomToiletAdded;
      case 'bathroom_shower': return bathroomShowerAdded;
      case 'kitchen_counter': return kitchenCounterAdded;
      case 'kitchen_fridge': return kitchenFridgeAdded;
      case 'studio_bed': return studioBedAdded;
      case 'studio_desk': return studioDeskAdded;
      case 'studio_wardrobe': return studioWardrobeAdded;
      
      default: return false;
    }
  };

  // Monitor external refinements applied via phase 2 and handle precise bi-directional sync
  useEffect(() => {
    // 1. Detect if any previously processed prompt has been REMOVED/DEACTIVATED from appliedRefinements
    const currentSet = new Set(appliedRefinements);
    for (const prompt of processedRefinementsRef.current) {
      if (!currentSet.has(prompt)) {
        processedRefinementsRef.current.delete(prompt);
        // Automatically revert the active state of this item
        
        // --- 1.1 EXACT MATCH PATTERNS FOR REMOVAL (Highest Priority to avoid cross-fire triggers) ---
        if (prompt === '將主沙發更換為溫潤色澤的頂級棕色皮革沙發') {
          setLeatherPresetActive(false);
          setCouchMaterial('fabric');
          continue;
        }
        if (prompt === '將地板全數鋪設為溫暖質樸的北歐橡木人字拼木地板') {
          setHerringbonePresetActive(false);
          setFloorStyle('oak');
          continue;
        }
        if (prompt === '在角落或天花板邊緣導入柔和的暖黃色落日落地燈') {
          setFloorLampAdded(false);
          continue;
        }
        if (prompt === '在床頭櫃或書桌頂部架設一座褶縐 Origami 百褶摺紙精緻精美檯燈') {
          setTableLampAdded(false);
          continue;
        }
        if (prompt === '在房間角落佈置高雅的羽裂龜背芋盆栽') {
          setPlantAdded(false);
          continue;
        }
        if (prompt === '在主牆面懸掛一幅現代極簡手繪幾何抽象藝術畫作') {
          setArtworkAdded(false);
          continue;
        }
        if (prompt === '在茶几或置物櫃面搭配一疊巴黎藝術史學疊書與頂部精美香氛蠟燭') {
          setStackedBooksAdded(false);
          continue;
        }
        if (prompt === '在牆面掛設一幅莫蘭迪植物學風格的淡雅版畫') {
          setBotanicalPrintAdded(false);
          continue;
        }
        if (prompt === '在牆面掛設一幅抽象表現主義風格的大型油畫') {
          setAbstractOilAdded(false);
          continue;
        }
        if (prompt === '在牆面懸掛一幅日式傳統水墨山水掛軸') {
          setJapanInkAdded(false);
          continue;
        }
        if (prompt === '在空間中添置一座優雅奢華的恆溫玻璃落地酒櫃') {
          setWineCabinetAdded(false);
          continue;
        }
        if (prompt === '在臥室佈置一座簡潔美觀的高大收納衣櫃') {
          setWardrobeAdded(false);
          continue;
        }
        if (prompt === '設置北歐風格的松木貓爬架，結合天然麻繩抓柱') {
          setCatTowerAdded(false);
          continue;
        }
        if (prompt === '在空間擺設輕奢黃銅大理石頂級雙層移動吧台車') {
          setBarCartAdded(false);
          continue;
        }
        if (prompt === '在桌面上端置放優雅的工藝陶瓷香氛與蘆葦擴香') {
          setDiffuserAdded(false);
          continue;
        }
        if (prompt === '在沙發或床邊配置依風格搭配的方形軟抱枕') {
          setCushionsAdded(false);
          continue;
        }
        if (prompt === '在空間中央鋪設依風格搭配的柔軟區域地毯') {
          setAreaRugAdded(false);
          continue;
        }
        if (prompt === '在沙發或床尾加入與風格相襯的織品披毯') {
          setThrowBlanketAdded(false);
          continue;
        }
        if (prompt === '在窗邊配置與空間風格相襯的柔性窗簾') {
          setCurtainsAdded(false);
          continue;
        }
        if (prompt === '在主牆面配置一面圓形金屬框牆鏡') {
          setWallMirrorAdded(false);
          continue;
        }
        if (prompt === '在空間中置放一尊淡雅冰裂釉工藝陶瓷花瓶點綴') {
          setVaseAdded(false);
          continue;
        }
        if (prompt === '在牆面掛設一座現代金屬拉絲極簡指針掛鐘') {
          setClockAdded(false);
          continue;
        }
        if (prompt === '在玄關或角落擺設一座櫻桃木格柵雕工雙門鞋櫃') {
          setShoeCabinetAdded(false);
          continue;
        }
        if (prompt === '將天花板燈飾切換為現代極簡微米筒燈' ||
            prompt === '將天花板燈飾切換為北歐暖白漏斗吊燈' ||
            prompt === '將天花板燈飾切換為工業黑色軌道射燈' ||
            prompt === '將天花板燈飾切換為極奢黃銅星環雙層吊燈') {
          setCeilingLightPresetStyle(null);
          continue;
        }
        if (prompt === '在房間中置入一展溫馨亮麗的義式奶油玻璃蘑菇檯燈') {
          setMushroomLampAdded(false);
          continue;
        }
        if (prompt === '在桌面上添置一盞極具年代感與浪漫文藝氣息的祖母綠玻璃檯燈') {
          setVintageLampAdded(false);
          continue;
        }
        if (prompt === '在角落擺設一盞充滿力學設計張力的極簡懸臂落地燈') {
          setCantileverLampAdded(false);
          continue;
        }
        if (prompt === '在死角增設一組前衛藝術感的球形電鍍落地燈') {
          setRetroSphereLampAdded(false);
          continue;
        }
        if (prompt === '在套房死角佈置收納衣櫃') {
          setStudioWardrobeAdded(false);
          continue;
        }
        if (prompt === '在套房靠窗安設多功能小書桌椅') {
          setStudioDeskAdded(false);
          continue;
        }

        // --- 1.2 FUZZY MATCH PATTERNS FOR REMOVAL (Fallback for manual user prompts chat) ---
        if (prompt.includes("沙發") && prompt.includes("皮革")) {
          setLeatherPresetActive(false);
          setCouchMaterial('fabric');
        }
        if (prompt.includes("人字拼")) {
          setHerringbonePresetActive(false);
          setFloorStyle('oak');
        }
        if (prompt.includes("落日落地燈") || (prompt.includes("落地燈") && !prompt.includes("檯燈") && !prompt.includes("吊燈") && !prompt.includes("筒燈"))) {
          setFloorLampAdded(false);
        }
        if (prompt.includes("百褶") || prompt.includes("摺紙") || (prompt.includes("檯燈") && !prompt.includes("落地燈"))) {
          setTableLampAdded(false);
        }
        if (prompt.includes("琴葉榕") || prompt.includes("龜背芋") || (prompt.includes("綠植") && !prompt.includes("畫") && !prompt.includes("沙發"))) {
          setPlantAdded(false);
        }
        if (prompt.includes("幾何抽象畫") || prompt.includes("抽象藝術畫") || (prompt.includes("抽象畫") && !prompt.includes("沙發"))) {
          setArtworkAdded(false);
        }
        if (prompt.includes("酒櫃") && !prompt.includes("吧台")) {
          setWineCabinetAdded(false);
        }
        if (prompt.includes("衣櫃") || prompt.includes("衣架") || prompt.includes("收納衣櫃") || prompt.includes("Wardrobe")) {
          setWardrobeAdded(false);
        }
        if (prompt.includes("貓爬架") || prompt.includes("貓抓")) {
          setCatTowerAdded(false);
        }
        if (prompt.includes("吧台車") || (prompt.includes("吧台") && !prompt.includes("酒櫃"))) {
          setBarCartAdded(false);
        }
        if (prompt.includes("清水混凝土") || prompt.includes("清水模")) {
          setConcreteWallAdded(false);
        }
        if (prompt.includes("香氛") || prompt.includes("擴香")) {
          setDiffuserAdded(false);
        }
        if (prompt.includes("莫蘭迪絨質") || prompt.includes("方形軟抱枕") || prompt.includes("靠墊") || prompt.includes("抱枕")) {
          setCushionsAdded(false);
        }
        if (prompt.includes("區域地毯") || prompt.includes("地毯")) {
          setAreaRugAdded(false);
        }
        if (prompt.includes("披毯") || prompt.includes("毛毯")) {
          setThrowBlanketAdded(false);
        }
        if (prompt.includes("窗簾") || prompt.includes("簾布")) {
          setCurtainsAdded(false);
        }
        if (prompt.includes("牆鏡") || prompt.includes("鏡子") || prompt.includes("圓形鏡")) {
          setWallMirrorAdded(false);
        }
        if (prompt.includes("花瓶") || prompt.includes("花器") || prompt.includes("陶瓷瓶") || prompt.includes("Vase")) {
          setVaseAdded(false);
        }
        if (prompt.includes("鐘") || prompt.includes("掛鐘") || prompt.includes("時鐘") || prompt.includes("Clock")) {
          setClockAdded(false);
        }
        if (prompt.includes("鞋櫃") || prompt.includes("鞋架") || prompt.includes("Shoe Cabinet")) {
          setShoeCabinetAdded(false);
        }
        if (prompt.includes("微米投射筒燈") || (prompt.includes("筒燈") && prompt.includes("極簡"))) {
          setCeilingLightPresetStyle(null);
        }
        if (prompt.includes("漏斗吊燈") || (prompt.includes("吊燈") && prompt.includes("北歐"))) {
          setCeilingLightPresetStyle(null);
        }
        if (prompt.includes("軌道射燈") || (prompt.includes("軌道燈") && prompt.includes("工業"))) {
          setCeilingLightPresetStyle(null);
        }
        if (prompt.includes("雙層環形星光") || (prompt.includes("吊燈") && prompt.includes("極奢"))) {
          setCeilingLightPresetStyle(null);
        }
      }
    }

    // 2. Add and process newly activated refinements with perfect disjoint pattern matching
    appliedRefinements.forEach(prompt => {
      if (processedRefinementsRef.current.has(prompt)) {
        return;
      }
      processedRefinementsRef.current.add(prompt);

      // --- 2.1 EXACT MATCH PATTERNS FOR ADDITION (Highest Priority to avoid cross-fire triggers) ---
      if (prompt === '將主沙發更換為溫潤色澤的頂級棕色皮革沙發') {
        setLeatherPresetActive(true);
        setCouchMaterial('leather');
        return;
      }
      if (prompt === '將地板全數鋪設為溫暖質樸的北歐橡木人字拼木地板') {
        setHerringbonePresetActive(true);
        setFloorStyle('herringbone');
        return;
      }
      if (prompt === '在角落或天花板邊緣導入柔和的暖黃色落日落地燈') {
        setFloorLampAdded(true);
        setCustomLampsOn(true);
        return;
      }
      if (prompt === '在床頭櫃或書桌頂部架設一座褶縐 Origami 百褶摺紙精緻精美檯燈') {
        setTableLampAdded(true);
        setCustomLampsOn(true);
        return;
      }
      if (prompt === '在房間角落佈置高雅的羽裂龜背芋盆栽') {
        setPlantAdded(true);
        return;
      }
      if (prompt === '在主牆面懸掛一幅現代極簡手繪幾何抽象藝術畫作') {
        setArtworkAdded(true);
        return;
      }
      if (prompt === '在空間中添置一座優雅奢華的恆溫玻璃落地酒櫃') {
        setWineCabinetAdded(true);
        return;
      }
      if (prompt === '在臥室佈置一座簡潔美觀的高大收納衣櫃') {
        setWardrobeAdded(true);
        return;
      }
      if (prompt === '設置北歐風格的松木貓爬架，結合天然麻繩抓柱') {
        setCatTowerAdded(true);
        return;
      }
      if (prompt === '在空間擺設輕奢黃銅大理石頂級雙層移動吧台車') {
        setBarCartAdded(true);
        return;
      }
      if (prompt === '在桌面上端置放優雅的工藝陶瓷香氛與蘆葦擴香') {
        setDiffuserAdded(true);
        return;
      }
      if (prompt === '在沙發或床邊配置依風格搭配的方形軟抱枕') {
        setCushionsAdded(true);
        return;
      }
      if (prompt === '在空間中央鋪設依風格搭配的柔軟區域地毯') {
        setAreaRugAdded(true);
        return;
      }
      if (prompt === '在沙發或床尾加入與風格相襯的織品披毯') {
        setThrowBlanketAdded(true);
        return;
      }
      if (prompt === '在窗邊配置與空間風格相襯的柔性窗簾') {
        setCurtainsAdded(true);
        return;
      }
      if (prompt === '在主牆面配置一面圓形金屬框牆鏡') {
        setWallMirrorAdded(true);
        return;
      }
      if (prompt === '在空間中置放一尊淡雅冰裂釉工藝陶瓷花瓶點綴') {
        setVaseAdded(true);
        return;
      }
      if (prompt === '在牆面掛設一座現代金屬拉絲極簡指針掛鐘') {
        setClockAdded(true);
        return;
      }
      if (prompt === '在玄關或角落擺設一座櫻桃木格柵雕工雙門鞋櫃') {
        setShoeCabinetAdded(true);
        return;
      }
      if (prompt === '在茶几或置物櫃面搭配一疊巴黎藝術史學疊書與頂部精美香氛蠟燭') {
        setStackedBooksAdded(true);
        return;
      }
      if (prompt === '在牆面掛設一幅莫蘭迪植物學風格的淡雅版畫') {
        setBotanicalPrintAdded(true);
        return;
      }
      if (prompt === '在牆面掛設一幅抽象表現主義風格的大型油畫') {
        setAbstractOilAdded(true);
        return;
      }
      if (prompt === '在牆面懸掛一幅日式傳統水墨山水掛軸') {
        setJapanInkAdded(true);
        return;
      }
      if (prompt === '將天花板燈飾切換為現代極簡微米筒燈') {
        setCeilingLightPresetStyle('modern');
        return;
      }
      if (prompt === '將天花板燈飾切換為北歐暖白漏斗吊燈') {
        setCeilingLightPresetStyle('scandinavian');
        return;
      }
      if (prompt === '將天花板燈飾切換為工業黑色軌道射燈') {
        setCeilingLightPresetStyle('industrial');
        return;
      }
      if (prompt === '將天花板燈飾切換為極奢黃銅星環雙層吊燈') {
        setCeilingLightPresetStyle('luxury');
        return;
      }
      if (prompt === '在房間中置入一展溫馨亮麗的義式奶油玻璃蘑菇檯燈') {
        setMushroomLampAdded(true);
        setCustomLampsOn(true);
        return;
      }
      if (prompt === '在桌面上添置一盞極具年代感與浪漫文藝氣息的祖母綠玻璃檯燈') {
        setVintageLampAdded(true);
        setCustomLampsOn(true);
        return;
      }
      if (prompt === '在角落擺設一盞充滿力學設計張力的極簡懸臂落地燈') {
        setCantileverLampAdded(true);
        setCustomLampsOn(true);
        return;
      }
      if (prompt === '在死角增設一組前衛藝術感的球形電鍍落地燈') {
        setRetroSphereLampAdded(true);
        setCustomLampsOn(true);
        return;
      }
      if (prompt === '在套房死角佈置收納衣櫃') {
        setStudioWardrobeAdded(true);
        return;
      }
      if (prompt === '在套房靠窗安設多功能小書桌椅') {
        setStudioDeskAdded(true);
        return;
      }

      // --- 2.2 FUZZY MATCH PATTERNS FOR ADDITION (Fallback for manual user prompts chat) ---
      if (prompt.includes("沙發") && prompt.includes("皮革")) {
        setLeatherPresetActive(true);
        setCouchMaterial('leather');
      }
      if (prompt.includes("人字拼")) {
        setHerringbonePresetActive(true);
        setFloorStyle('herringbone');
      }
      if (prompt.includes("落日落地燈") || (prompt.includes("落地燈") && !prompt.includes("檯燈") && !prompt.includes("吊燈") && !prompt.includes("筒燈"))) {
        setFloorLampAdded(true);
        setCustomLampsOn(true);
      }
      if (prompt.includes("百褶") || prompt.includes("摺紙") || (prompt.includes("檯燈") && !prompt.includes("落地燈"))) {
        setTableLampAdded(true);
        setCustomLampsOn(true);
      }
      if (prompt.includes("琴葉榕") || prompt.includes("龜背芋") || (prompt.includes("綠植") && !prompt.includes("畫") && !prompt.includes("沙發"))) {
        setPlantAdded(true);
      }
      if (prompt.includes("幾何抽象畫") || prompt.includes("抽象藝術畫") || (prompt.includes("抽象畫") && !prompt.includes("沙發"))) {
        setArtworkAdded(true);
      }
      if (prompt.includes("酒櫃") && !prompt.includes("吧台")) {
        setWineCabinetAdded(true);
      }
      if (prompt.includes("衣櫃") || prompt.includes("衣架") || prompt.includes("收納衣櫃") || prompt.includes("Wardrobe")) {
        setWardrobeAdded(true);
      }
      if (prompt.includes("貓爬架") || prompt.includes("貓抓")) {
        setCatTowerAdded(true);
      }
      if (prompt.includes("吧台車") || (prompt.includes("吧台") && !prompt.includes("酒櫃"))) {
        setBarCartAdded(true);
      }
      if (prompt.includes("清水混凝土") || prompt.includes("清水模")) {
        setConcreteWallAdded(true);
        setWallColor('slate');
      }
      if (prompt.includes("香氛") || prompt.includes("擴香")) {
        setDiffuserAdded(true);
      }
      if (prompt.includes("莫蘭迪絨質") || prompt.includes("方形軟抱枕") || prompt.includes("靠墊") || prompt.includes("抱枕")) {
        setCushionsAdded(true);
      }
      if (prompt.includes("區域地毯") || prompt.includes("地毯")) {
        setAreaRugAdded(true);
      }
      if (prompt.includes("披毯") || prompt.includes("毛毯")) {
        setThrowBlanketAdded(true);
      }
      if (prompt.includes("窗簾") || prompt.includes("簾布")) {
        setCurtainsAdded(true);
      }
      if (prompt.includes("牆鏡") || prompt.includes("鏡子") || prompt.includes("圓形鏡")) {
        setWallMirrorAdded(true);
      }
      if (prompt.includes("花瓶") || prompt.includes("花器") || prompt.includes("陶瓷瓶") || prompt.includes("Vase")) {
        setVaseAdded(true);
      }
      if (prompt.includes("鐘") || prompt.includes("掛鐘") || prompt.includes("時鐘") || prompt.includes("Clock")) {
        setClockAdded(true);
      }
      if (prompt.includes("鞋櫃") || prompt.includes("鞋架") || prompt.includes("Shoe Cabinet")) {
        setShoeCabinetAdded(true);
      }
      if (prompt.includes("微米投射筒燈") || (prompt.includes("筒燈") && prompt.includes("極簡"))) {
        setCeilingLightPresetStyle('modern');
      }
      if (prompt.includes("漏斗吊燈") || (prompt.includes("吊燈") && prompt.includes("北歐"))) {
        setCeilingLightPresetStyle('scandinavian');
      }
      if (prompt.includes("軌道射燈") || (prompt.includes("軌道燈") && prompt.includes("工業"))) {
        setCeilingLightPresetStyle('industrial');
      }
      if (prompt.includes("雙層環形星光") || (prompt.includes("吊燈") && prompt.includes("極奢"))) {
        setCeilingLightPresetStyle('luxury');
      }
      if (prompt.includes("吸頂燈") || prompt.includes("普通天花燈") || prompt.includes("預設燈")) {
        setCeilingLightPresetStyle(null);
      }
    });
  }, [appliedRefinements]);

  // Handle Preset refinements click internally with direct removal option
  const handleToggleInternalRefinement = (key: string, prompt: string) => {
    const isCurrentlyActive = getIsPresetActive(key);

    switch(key) {
      case 'leather':
        setLeatherPresetActive(prev => {
          const next = !prev;
          setCouchMaterial(next ? 'leather' : 'fabric');
          return next;
        });
        break;
      case 'floor':
        setHerringbonePresetActive(prev => !prev);
        break;
      case 'lamp':
        setFloorLampAdded(prev => {
          const next = !prev;
          if (next) {
            setCustomLampsOn(true);
          } else {
            if (selectedFurniture === 'accent_lamp') setSelectedFurniture('sofa_or_bed');
            if (!tableLampAdded && !mushroomLampAdded && !vintageLampAdded && !cantileverLampAdded && !retroSphereLampAdded) setCustomLampsOn(false);
          }
          return next;
        });
        break;
      case 'plant':
        setPlantAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'accent_plant') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'art':
        setArtworkAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'accent_artwork') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'wine_cabinet':
        setWineCabinetAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'wine_cabinet') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'wardrobe':
        setWardrobeAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'wardrobe') {
            setSelectedFurniture('sofa_or_bed');
          }
          return next;
        });
        break;
      case 'cat_tower':
        setCatTowerAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'cat_tower') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'bar_cart':
        setBarCartAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'bar_cart') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'concrete':
        setConcreteWallAdded(prev => !prev);
        break;
      case 'diffuser':
        setDiffuserAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'diffuser') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'cushions':
        setCushionsAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'cushions') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'area_rug':
        setAreaRugAdded(prev => !prev);
        break;
      case 'throw_blanket':
        setThrowBlanketAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'throw_blanket') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'curtains':
        setCurtainsAdded(prev => !prev);
        break;
      case 'wall_mirror':
        setWallMirrorAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'wall_mirror') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'vase':
        setVaseAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'vase') {
            setSelectedFurniture('sofa_or_bed');
          }
          return next;
        });
        break;
      case 'clock':
        setClockAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'clock') {
            setSelectedFurniture('sofa_or_bed');
          }
          return next;
        });
        break;
      case 'shoe_cabinet':
        setShoeCabinetAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'shoe_cabinet') {
            setSelectedFurniture('sofa_or_bed');
          }
          return next;
        });
        break;
      case 'table_lamp':
        setTableLampAdded(prev => {
          const next = !prev;
          if (next) {
            setCustomLampsOn(true);
          } else {
            if (selectedFurniture === 'table_lamp') setSelectedFurniture('sofa_or_bed');
            if (!floorLampAdded && !mushroomLampAdded && !vintageLampAdded && !cantileverLampAdded && !retroSphereLampAdded) setCustomLampsOn(false);
          }
          return next;
        });
        break;
      case 'mushroom_lamp':
        setMushroomLampAdded(prev => {
          const next = !prev;
          if (next) { setCustomLampsOn(true); }
          else {
            if (selectedFurniture === 'mushroom_lamp') setSelectedFurniture('sofa_or_bed');
            if (!floorLampAdded && !tableLampAdded && !vintageLampAdded && !cantileverLampAdded && !retroSphereLampAdded) setCustomLampsOn(false);
          }
          return next;
        });
        break;
      case 'vintage_lamp':
        setVintageLampAdded(prev => {
          const next = !prev;
          if (next) { setCustomLampsOn(true); }
          else {
            if (selectedFurniture === 'vintage_lamp') setSelectedFurniture('sofa_or_bed');
            if (!floorLampAdded && !tableLampAdded && !mushroomLampAdded && !cantileverLampAdded && !retroSphereLampAdded) setCustomLampsOn(false);
          }
          return next;
        });
        break;
      case 'cantilever_lamp':
        setCantileverLampAdded(prev => {
          const next = !prev;
          if (next) { setCustomLampsOn(true); }
          else {
            if (selectedFurniture === 'cantilever_lamp') setSelectedFurniture('sofa_or_bed');
            if (!floorLampAdded && !tableLampAdded && !mushroomLampAdded && !vintageLampAdded && !retroSphereLampAdded) setCustomLampsOn(false);
          }
          return next;
        });
        break;
      case 'retro_sphere_lamp':
        setRetroSphereLampAdded(prev => {
          const next = !prev;
          if (next) { setCustomLampsOn(true); }
          else {
            if (selectedFurniture === 'retro_sphere_lamp') setSelectedFurniture('sofa_or_bed');
            if (!floorLampAdded && !tableLampAdded && !mushroomLampAdded && !vintageLampAdded && !cantileverLampAdded) setCustomLampsOn(false);
          }
          return next;
        });
        break;
      case 'turntable':
        setTurntableAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'turntable') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'sculpture':
        setSculptureAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'sculpture') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'stacked_books':
        setStackedBooksAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'stacked_books') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'botanical_print':
        setBotanicalPrintAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'botanical_print') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'abstract_oil':
        setAbstractOilAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'abstract_oil') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'japan_ink':
        setJapanInkAdded(prev => {
          const next = !prev;
          if (!next && selectedFurniture === 'japan_ink') setSelectedFurniture('sofa_or_bed');
          return next;
        });
        break;
      case 'ceiling_modern':
        setCeilingLightPresetStyle(prev => prev === 'modern' ? null : 'modern');
        break;
      case 'ceiling_scandi':
        setCeilingLightPresetStyle(prev => prev === 'scandinavian' ? null : 'scandinavian');
        break;
      case 'ceiling_industrial':
        setCeilingLightPresetStyle(prev => prev === 'industrial' ? null : 'industrial');
        break;
      case 'ceiling_luxury':
        setCeilingLightPresetStyle(prev => prev === 'luxury' ? null : 'luxury');
        break;
        
      // Core Furniture cases
      case 'living_sofa':
        setLivingSofaAdded(prev => !prev);
        break;
      case 'living_coffee_table':
        setLivingCoffeeTableAdded(prev => !prev);
        break;
      case 'living_tv_console':
        setLivingTvConsoleAdded(prev => !prev);
        break;
      case 'bedroom_bed':
        setBedroomBedAdded(prev => !prev);
        break;
      case 'bedroom_stands':
        setBedroomStandsAdded(prev => !prev);
        break;
      case 'dining_set':
        setDiningSetAdded(prev => !prev);
        break;
      case 'dining_sideboard':
        setDiningSideboardAdded(prev => !prev);
        break;
      case 'office_desk':
        setOfficeDeskAdded(prev => !prev);
        break;
      case 'office_bookcase':
        setOfficeBookcaseAdded(prev => !prev);
        break;
      case 'bathroom_bathtub':
        setBathroomBathtubAdded(prev => !prev);
        break;
      case 'bathroom_vanity':
        setBathroomVanityAdded(prev => !prev);
        break;
      case 'bathroom_toilet':
        setBathroomToiletAdded(prev => !prev);
        break;
      case 'bathroom_shower':
        setBathroomShowerAdded(prev => !prev);
        break;
      case 'kitchen_counter':
        setKitchenCounterAdded(prev => !prev);
        break;
      case 'kitchen_fridge':
        setKitchenFridgeAdded(prev => !prev);
        break;
      case 'studio_bed':
        setStudioBedAdded(prev => !prev);
        break;
      case 'studio_desk':
        setStudioDeskAdded(prev => !prev);
        break;
      case 'studio_wardrobe':
        setStudioWardrobeAdded(prev => !prev);
        break;
    }

    // Fire back to App.tsx with isRemoving parameter based on current active state
    onApplyRefinement(prompt, isCurrentlyActive);
  };

  // Re-build/Update entire room contents when style, roomType, or discrete layout parameters change
  useEffect(() => {
    if (!canvasRef.current) return;

    // SCENE INITIALIZATION (Only if not done yet)
    let scene = sceneRef.current;
    let camera = cameraRef.current;
    let renderer = rendererRef.current;
    let controls = controlsRef.current;

    if (!scene) {
      scene = new THREE.Scene();
      sceneRef.current = scene;

      // Camera
      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(7, 6, 8);
      cameraRef.current = camera;

      // Renderer
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        preserveDrawingBuffer: true // Required for screenshot downloads
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      // Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2.1; // Limit panning too low under floor
      controls.minDistance = 2;
      controls.maxDistance = 22;
      controlsRef.current = controls;
    }

    // Handle Resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (renderer && camera) {
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Create a new container group to build the complete scene atomically and prevent flickering
    const roomContainer = new THREE.Group();
    roomContainer.name = "room_container";

    // Intercept scene.add to add elements to roomContainer instead of directly to scene
    const originalSceneAdd = scene.add.bind(scene);
    scene.add = (...args: any[]) => {
      roomContainer.add(...(args as any));
      return scene;
    };

    // 1. ADD GRADIENT SKY BOX OR ROOM SURROUNDINGS
    const gridHelper = new THREE.GridHelper(24, 24, 0x333333, 0x1d1d1d);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 2. DEFINE MATERIALS BASED ON SELECTIONS WITH PRESET OVERLAYS (NON-DESTRUCTIVE)
    const effectiveFloorStyle = herringbonePresetActive ? 'herringbone' : floorStyle;
    const effectiveCouchMaterial = leatherPresetActive ? 'leather' : couchMaterial;
    const effectiveCeilingLightStyle = ceilingLightPresetStyle || ceilingLightStyle;

    // Define colors according to light temperature selection: 'white' | 'warmwhite' | 'warmyellow'
    let tempColorHex = 0xffeed5; // default soft warm white
    if (lightTemperature === 'white') {
      tempColorHex = 0xffffff; // clean white daylight
    } else if (lightTemperature === 'warmwhite') {
      tempColorHex = 0xffeed5; // cozy soft warm white
    } else if (lightTemperature === 'warmyellow') {
      tempColorHex = 0xffaa44; // rich ambient warm amber
    }

    const selectedFloorObj = FLOOR_TYPES.find(f => f.id === effectiveFloorStyle) || FLOOR_TYPES[0];
    const selectedWallObj = WALL_COLORS.find(w => w.id === wallColor) || WALL_COLORS[0];

    // Colors matching style theme overlay
    let wallColorHex = selectedWallObj.color;
    if (wallUseCustomColor) {
      wallColorHex = parseInt(wallCustomColor.replace('#', '0x'), 16);
    }
    if (concreteWallAdded) {
      wallColorHex = 0x76787a; // Concrete raw cement color override
    }

    // Procedural Floor Texture Generator
    const createFloorTextureMap = (floorObj: any) => {
      // Exclude simple carpet from procedural pattern, keeping soft physical fiber look
      if (floorObj.id === 'carpet') {
        return null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const seeded01 = (seed: number) => {
        const value = Math.sin(seed) * 10000;
        return value - Math.floor(value);
      };

      const baseColor = '#' + floorObj.color.toString(16).padStart(6, '0');

      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 512, 512);

      if (floorObj.id === 'tile' || floorObj.id === 'slate_tile' || floorObj.id === 'vintage_tile') {
        const gridSize = 128; // 4x4 tiles
        // Grout line color
        ctx.fillStyle = floorObj.id === 'tile' ? '#eaeaea' : floorObj.id === 'slate_tile' ? '#212326' : '#5c3124';
        ctx.fillRect(0, 0, 512, 512);

        for (let y = 0; y < 512; y += gridSize) {
          for (let x = 0; x < 512; x += gridSize) {
            // Bevelled tile radial gradient
            const grad = ctx.createRadialGradient(x + gridSize / 2, y + gridSize / 2, 5, x + gridSize / 2, y + gridSize / 2, gridSize * 0.7);
            if (floorObj.id === 'tile') {
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(0.85, '#f5f5f3');
              grad.addColorStop(1, '#dfdfdf');
            } else if (floorObj.id === 'slate_tile') {
              grad.addColorStop(0, '#5a5d63');
              grad.addColorStop(0.85, '#42464c');
              grad.addColorStop(1, '#2a2d30');
            } else {
              grad.addColorStop(0, '#cf7a61');
              grad.addColorStop(0.85, '#b5654c');
              grad.addColorStop(1, '#8f4734');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);

            // Fine texturing for organic stone/clay look
            if (floorObj.id === 'slate_tile' || floorObj.id === 'vintage_tile') {
              ctx.fillStyle = 'rgba(0,0,0,0.03)';
              for (let i = 0; i < 30; i++) {
                const seed = x * 0.37 + y * 0.53 + i * 17.17;
                const rx = x + seeded01(seed) * (gridSize - 8) + 4;
                const ry = y + seeded01(seed + 11.31) * (gridSize - 8) + 4;
                const rw = seeded01(seed + 23.7) * 5 + 1;
                const rh = seeded01(seed + 31.9) * 5 + 1;
                ctx.fillRect(rx, ry, rw, rh);
              }
            }
          }
        }
      } else if (floorObj.id === 'herringbone') {
        // Interlocking wooden planks pattern (Herringbone layout)
        const boardW = 64;
        const boardH = 192;
        const shades = ['#916135', '#8b5a2b', '#7a4e23', '#9c6838'];

        // Dark grout backing
        ctx.fillStyle = '#4a3014';
        ctx.fillRect(0, 0, 512, 512);

        // Draw herringbone diagonal boards
        for (let xOffset = -256; xOffset < 768; xOffset += 128) {
          for (let yOffset = -256; yOffset < 768; yOffset += 128) {
            // Draw dual angled boards
            [0, Math.PI / 2].forEach((rot, rIdx) => {
              ctx.save();
              ctx.translate(xOffset, yOffset);
              ctx.rotate(Math.PI / 4 + rot);

              const seedIdx = Math.abs(Math.floor(Math.sin(xOffset * 11 + yOffset * 7 + rot) * 100));
              ctx.fillStyle = shades[seedIdx % shades.length];
              ctx.fillRect(1, 1, boardW - 2, boardH - 2);

              // Hardboard bevel overlay and grain simulation
              const grad = ctx.createLinearGradient(0, 0, boardW, 0);
              grad.addColorStop(0, 'rgba(255,255,255,0.05)');
              grad.addColorStop(1, 'rgba(0,0,0,0.08)');
              ctx.fillStyle = grad;
              ctx.fillRect(1, 1, boardW - 2, boardH - 2);

              // Fine grain streaks
              ctx.strokeStyle = 'rgba(0,0,0,0.03)';
              ctx.lineWidth = 0.8;
              for (let lineX = 6; lineX < boardW - 6; lineX += 14) {
                ctx.beginPath();
                ctx.moveTo(lineX, 2);
                ctx.lineTo(lineX, boardH - 2);
                ctx.stroke();
              }

              ctx.strokeStyle = 'rgba(0,0,0,0.18)';
              ctx.lineWidth = 0.8;
              ctx.strokeRect(1, 1, boardW - 2, boardH - 2);
              ctx.restore();
            });
          }
        }
      } else if (floorObj.id === 'oak' || floorObj.id === 'walnut') {
        const boardH = 42;
        const boardColors = floorObj.id === 'oak' ? 
          ['#ca9f72', '#c19a6b', '#b38e60', '#cc9f70'] : // Oak shades
          ['#452c16', '#3a2512', '#2f1e0d', '#4f331b'];  // Walnut shades

        ctx.fillStyle = floorObj.id === 'oak' ? '#5a4128' : '#1d1208'; // dark seams
        ctx.fillRect(0, 0, 512, 512);

        for (let y = 0; y < 512; y += boardH) {
          const offsetX = (y / boardH % 3) * 170;
          for (let x = -256; x < 768; x += 256) {
            const rx = x + offsetX;
            const seed = Math.abs(Math.sin(y * 11 + rx * 13));
            ctx.fillStyle = boardColors[Math.floor(seed * boardColors.length) % boardColors.length];

            ctx.fillRect(rx + 1, y + 1, 254, boardH - 2);

            const grad = ctx.createLinearGradient(rx, y, rx, y + boardH);
            grad.addColorStop(0, 'rgba(255,255,255,0.05)');
            grad.addColorStop(1, 'rgba(0,0,0,0.08)');
            ctx.fillStyle = grad;
            ctx.fillRect(rx + 1, y + 1, 254, boardH - 2);

            ctx.strokeStyle = 'rgba(0,0,0,0.03)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rx, y + boardH / 2);
            ctx.lineTo(rx + 254, y + boardH / 2);
            ctx.stroke();
          }
        }
      } else if (floorObj.id === 'marble') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = 'rgba(120, 122, 125, 0.16)';
        ctx.lineWidth = 1.5;
        const veinSegments = [
          [10, 50, 200, 300, 400, 480],
          [480, 20, 300, 200, 100, 500],
          [50, 400, 180, 220, 500, 100],
          [20, 20, 150, 250, 300, 450]
        ];
        veinSegments.forEach(seg => {
          ctx.beginPath();
          ctx.moveTo(seg[0], seg[1]);
          ctx.bezierCurveTo(seg[2], seg[3], seg[4], seg[5], seg[4] + 80, seg[5] + 80);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(120, 122, 125, 0.08)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(seg[2], seg[3]);
          ctx.lineTo(seg[2] + 40, seg[3] - 70);
          ctx.stroke();
        });

        // Marble slab joints
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(0, 0, 512, 512);
        ctx.strokeRect(256, 0, 256, 512);
        ctx.strokeRect(0, 256, 512, 256);
      } else if (floorObj.id === 'terrazzo') {
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        const chipColors = ['#cc7b62', '#415a77', '#778da9', '#ffffff', '#222222', '#d4af37', '#808000'];
        for (let i = 0; i < 300; i++) {
          const cx = seeded01(i * 13.19) * 512;
          const cy = seeded01(i * 29.41 + 4.7) * 512;
          const size = seeded01(i * 41.77 + 8.3) * 4 + 1;
          ctx.fillStyle = chipColors[i % chipColors.length];
          ctx.beginPath();
          ctx.arc(cx, cy, size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, 0, 512, 512);
        ctx.strokeRect(256, 0, 256, 512);
      } else if (floorObj.id === 'concrete') {
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 300);
        grad.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.02)');
        grad.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        for (let i = 0; i < 50; i++) {
          ctx.fillRect(
            seeded01(i * 7.13) * 512,
            seeded01(i * 17.89 + 3.1) * 512,
            seeded01(i * 29.7 + 5.6) * 2 + 1,
            seeded01(i * 37.3 + 9.4) * 2 + 1
          );
        }

        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(0, 0, 514, 514);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 4;
      
      let repeatFactor = 4;
      if (floorObj.id === 'herringbone') repeatFactor = 6;
      if (floorObj.id === 'oak' || floorObj.id === 'walnut') repeatFactor = 5;
      if (floorObj.id === 'tile' || floorObj.id === 'slate_tile' || floorObj.id === 'vintage_tile') repeatFactor = 5;

      texture.repeat.set(repeatFactor * floorTiling, repeatFactor * floorTiling);
      texture.needsUpdate = true;
      return texture;
    };

    const floorTexture = createFloorTextureMap(selectedFloorObj);
    const floorBumpScale = floorTexture ? (
      selectedFloorObj.id === 'oak' || selectedFloorObj.id === 'walnut' ? 0.018 :
      selectedFloorObj.id === 'herringbone' ? 0.014 :
      selectedFloorObj.id === 'tile' || selectedFloorObj.id === 'slate_tile' || selectedFloorObj.id === 'vintage_tile' ? 0.007 :
      selectedFloorObj.id === 'concrete' ? 0.012 :
      selectedFloorObj.id === 'terrazzo' ? 0.004 :
      selectedFloorObj.id === 'marble' ? 0.003 :
      0
    ) : 0;

    // Ground Material (Floor) with custom roughness override and procedural patterns
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorTexture ? 0xffffff : selectedFloorObj.color,
      map: floorTexture,
      bumpMap: floorTexture,
      bumpScale: floorBumpScale,
      roughness: floorRoughness, // Live slider!
      metalness: selectedFloorObj.metalness,
    });

    // Floor design elements (procedural grids for Herringbone or Marble tile lines)
    if (selectedFloorObj.id === 'herringbone') {
      floorMat.roughness = floorRoughness;
    } else if (selectedFloorObj.id === 'marble') {
      floorMat.metalness = 0.35;
    }

    // Interactive procedural grout grid overlay based on floorTiling state
    if (
      selectedFloorObj.id === 'marble' ||
      selectedFloorObj.id === 'terrazzo' ||
      selectedFloorObj.id === 'concrete' ||
      selectedFloorObj.id === 'tile' ||
      selectedFloorObj.id === 'slate_tile' ||
      selectedFloorObj.id === 'vintage_tile'
    ) {
      // Create separate overlay so tiles pop
      const gridDensity = Math.round(6 * floorTiling);
      const floorTileGrid = new THREE.GridHelper(24, gridDensity, 0x000000, 0x000000);
      floorTileGrid.position.set(0, 0.001, 0);
      if (floorTileGrid.material && 'transparent' in floorTileGrid.material) {
        (floorTileGrid.material as any).transparent = true;
        (floorTileGrid.material as any).opacity = 0.06;
      }
      scene.add(floorTileGrid);
    }

    // Base roughness/metalness based on wall base material style selection
    let wallRoughness = 0.85;
    let wallMetalness = 0.02;
    let wallTileMap: THREE.Texture | null = null;
    let accentTileMap: THREE.Texture | null = null;

    if (wallMaterialType === 'concrete') {
      wallRoughness = 0.95;
      wallMetalness = 0.1;
    } else if (wallMaterialType === 'plaster') {
      wallRoughness = 0.65;
      wallMetalness = 0.15;
    } else if (wallMaterialType === 'wood') {
      wallRoughness = 0.72;
      wallMetalness = 0.04;
    } else if (wallMaterialType === 'tile') {
      wallRoughness = 0.14; // Glossy glazed ceramic finish
      wallMetalness = 0.08;

      // Infallible conversion of color number to CSS hex string
      const colorToCss = (c: number) => '#' + c.toString(16).padStart(6, '0');

      // Procedural Glazed Ceramic grid texture
      const createWallTileTexture = (baseColorHex: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const baseColor = colorToCss(baseColorHex);

        // Fill base tile color
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        // Draw tile body shading/texture for glossy ceramic bevel highlight
        const gridSize = 64; // nice 8x8 pattern
        for (let y = 0; y < 512; y += gridSize) {
          for (let x = 0; x < 512; x += gridSize) {
            const grad = ctx.createRadialGradient(x + 32, y + 32, 2, x + 32, y + 32, 45);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
            grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.02)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
            ctx.fillStyle = grad;
            ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
          }
        }

        // Draw crisp horizontal and vertical grout lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i <= 512; i += gridSize) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 512);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(512, i);
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
        ctx.lineWidth = 1.0;
        for (let i = 1; i <= 513; i += gridSize) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 512);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(512, i);
          ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 4;
        // Repeat so count is realistic
        texture.repeat.set(6, 3);
        texture.needsUpdate = true;
        return texture;
      };

      wallTileMap = createWallTileTexture(wallColorHex);

      const accentColorHexCandidate = parseInt(wallAccentColor.replace('#', '0x'), 16);
      const targetAccentColorHex = wallAccentColor.startsWith('#') ? accentColorHexCandidate : selectedWallObj.color;
      accentTileMap = createWallTileTexture(targetAccentColorHex);
    }

    // Wall Material
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColorHex,
      roughness: wallRoughness,
      metalness: wallMetalness,
      map: wallTileMap || null,
      bumpMap: wallTileMap || null,
      bumpScale: wallTileMap ? 0.006 : 0
    });

    // Accent Wall Material (Optional feature back main wall)
    const accentColorHex = parseInt(wallAccentColor.replace('#', '0x'), 16);
    const accentMat = new THREE.MeshStandardMaterial({
      color: wallAccentColor.startsWith('#') ? accentColorHex : selectedWallObj.color,
      roughness: wallRoughness,
      metalness: wallMetalness,
      map: accentTileMap || null,
      bumpMap: accentTileMap || null,
      bumpScale: accentTileMap ? 0.006 : 0
    });

    // Concrete overlay visual material
    const cementBackWallMat = new THREE.MeshStandardMaterial({
      color: 0x838587,
      roughness: 0.9,
    });

    // Moldings trim color
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.5
    });

    // 3. BUILD THE ARCHITECTURAL ROOM BOX
    // Dimensions
    const roomW = roomWidth / 100;
    const roomH = roomHeight / 100;
    const roomD = roomLength / 100;

    // Ensure wall materials have double-sided shadow calculations but single-sided visual culling
    wallMat.shadowSide = THREE.DoubleSide;
    cementBackWallMat.shadowSide = THREE.DoubleSide;

    // Floor Mesh (Horizontal plane facing up)
    const floorGeo = new THREE.PlaneGeometry(roomW, roomD);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;

    // Ceiling Mesh (Horizontal plane facing down)
    const ceilingGeo = new THREE.PlaneGeometry(roomW, roomD);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: selectedWallObj.color,
      roughness: 0.95,
      shadowSide: THREE.DoubleSide,
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.set(0, roomH, 0);
    ceilingMesh.receiveShadow = true;
    scene.add(ceilingMesh);

    // Back Wall (Vertical plane facing forward +Z - with customizable accent wall)
    const backWallGeo = new THREE.PlaneGeometry(roomW, roomH);
    const backWallMatToUse = concreteWallAdded 
      ? cementBackWallMat 
      : (wallAccentEnabled ? accentMat : wallMat);
    const backWall = new THREE.Mesh(backWallGeo, backWallMatToUse);
    backWall.position.set(0, roomH / 2, -roomD / 2);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    scene.add(backWall);

    // Apply physical wood slat overlay if accent wall set to wood panels
    if (wallMaterialType === 'wood' && wallAccentEnabled) {
      const slatGroup = new THREE.Group();
      const slatNum = Math.floor(roomW * 22); // number of slats across width
      const slatW = 0.024;
      const slatD = 0.015;
      const slatMat = new THREE.MeshStandardMaterial({
        color: accentColorHex,
        roughness: 0.65,
        metalness: 0.05
      });
      for (let i = 0; i < slatNum; i++) {
        const slatGeo = new THREE.BoxGeometry(slatW, roomH, slatD);
        const slat = new THREE.Mesh(slatGeo, slatMat);
        const posX = -roomW / 2 + (i / (slatNum - 1)) * (roomW - slatW) + slatW / 2;
        slat.position.set(posX, roomH / 2, -roomD / 2 + slatD / 2 + 0.002);
        slat.castShadow = true;
        slat.receiveShadow = true;
        slatGroup.add(slat);
      }
      scene.add(slatGroup);
    }

    // Front Wall (Vertical plane facing backward -Z)
    const frontWallGeo = new THREE.PlaneGeometry(roomW, roomH);
    frontWallGeo.rotateY(Math.PI);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(0, roomH / 2, roomD / 2);
    frontWall.receiveShadow = true;
    frontWall.castShadow = true;
    scene.add(frontWall);

    // Left Wall (Vertical plane facing right +X)
    const leftWallGeo = new THREE.PlaneGeometry(roomD, roomH);
    leftWallGeo.rotateY(Math.PI / 2);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-roomW / 2, roomH / 2, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    scene.add(leftWall);

    // Right Wall (Vertical plane facing left -X)
    const rightWallGeo = new THREE.PlaneGeometry(roomD, roomH);
    rightWallGeo.rotateY(-Math.PI / 2);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(roomW / 2, roomH / 2, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    scene.add(rightWall);

    // Trim Baseboards (For all 4 walls)
    const trimBackGeo = new THREE.BoxGeometry(roomW, 0.1, 0.02);
    const trimBack = new THREE.Mesh(trimBackGeo, trimMat);
    trimBack.position.set(0, 0.05, -roomD / 2 + 0.015);
    trimBack.receiveShadow = true;
    trimBack.castShadow = true;
    scene.add(trimBack);

    const trimLeftGeo = new THREE.BoxGeometry(0.02, 0.1, roomD);
    const trimLeft = new THREE.Mesh(trimLeftGeo, trimMat);
    trimLeft.position.set(-roomW / 2 + 0.015, 0.05, 0);
    trimLeft.receiveShadow = true;
    trimLeft.castShadow = true;
    scene.add(trimLeft);

    const trimRightGeo = new THREE.BoxGeometry(0.02, 0.1, roomD);
    const trimRight = new THREE.Mesh(trimRightGeo, trimMat);
    trimRight.position.set(roomW / 2 - 0.015, 0.05, 0);
    trimRight.receiveShadow = true;
    trimRight.castShadow = true;
    scene.add(trimRight);

    const trimFrontGeo = new THREE.BoxGeometry(roomW, 0.1, 0.02);
    const trimFront = new THREE.Mesh(trimFrontGeo, trimMat);
    trimFront.position.set(0, 0.05, roomD / 2 - 0.015);
    trimFront.receiveShadow = true;
    trimFront.castShadow = true;
    scene.add(trimFront);

    // ---- ADD DYNAMIC DOOR RENDER ----
    const doorColorNum = parseInt(doorColor.replace('#', '0x'), 16);
    const doorMesh = createDoorMesh(doorStyle, doorColorNum);
    
    // Position/Rotate door based on wall selection
    if (doorPosition === 'right') {
      const bZ = Math.max(-roomD / 2 + 0.6, Math.min(roomD / 2 - 0.6, doorOffset));
      doorMesh.position.set(roomW / 2 - 0.01, 0, bZ);
      doorMesh.rotation.y = -Math.PI / 2;
    } else if (doorPosition === 'left') {
      const bZ = Math.max(-roomD / 2 + 0.6, Math.min(roomD / 2 - 0.6, doorOffset));
      doorMesh.position.set(-roomW / 2 + 0.01, 0, bZ);
      doorMesh.rotation.y = Math.PI / 2;
    } else { // 'back'
      const bX = Math.max(-roomW / 2 + 0.6, Math.min(roomW / 2 - 0.6, doorOffset));
      doorMesh.position.set(bX, 0, -roomD / 2 + 0.01);
      doorMesh.rotation.y = 0;
    }
    scene.add(doorMesh);

    // ---- ADD DYNAMIC WINDOW RENDER ----
    let actualW = windowWidth;
    let actualH = windowWidth * 0.9; // maintain golden ratio standard
    if (windowStyle === 'fixed_vertical') {
      actualW = 0.6;
      actualH = Math.min(roomH - 0.4, 2.0);
    } else if (windowStyle === 'fixed_horizontal') {
      actualW = Math.min(roomW - 0.8, 2.2);
      actualH = 0.4;
    } else if (windowStyle.includes('double')) {
      actualW = Math.min(roomW - 1.0, 1.8);
      actualH = 1.1;
    } else {
      actualW = 1.1;
      actualH = 1.1;
    }

    const windowMesh = createWindowMesh(windowStyle, actualW, actualH);
    
    // Height bounding calculation
    let winY = windowHeight;
    if (windowStyle === 'fixed_vertical') {
      winY = Math.max(0.15 + actualH / 2, Math.min(roomH - actualH / 2 - 0.15, windowHeight));
    } else if (windowStyle === 'fixed_horizontal') {
      winY = Math.max(roomH - 0.35, Math.min(roomH - 0.2, windowHeight)); // High up on wall usually
    } else {
      winY = Math.max(0.45 + actualH / 2, Math.min(roomH - actualH / 2 - 0.15, windowHeight));
    }

    if (windowPosition === 'left') {
      const bZ = Math.max(-roomD / 2 + actualW / 2 + 0.2, Math.min(roomD / 2 - actualW / 2 - 0.2, windowOffset));
      windowMesh.position.set(-roomW / 2 + 0.01, winY, bZ);
      windowMesh.rotation.y = Math.PI / 2;
    } else if (windowPosition === 'right') {
      const bZ = Math.max(-roomD / 2 + actualW / 2 + 0.2, Math.min(roomD / 2 - actualW / 2 - 0.2, windowOffset));
      windowMesh.position.set(roomW / 2 - 0.01, winY, bZ);
      windowMesh.rotation.y = -Math.PI / 2;
    } else { // 'back'
      const bX = Math.max(-roomW / 2 + actualW / 2 + 0.2, Math.min(roomW / 2 - actualW / 2 - 0.2, windowOffset));
      windowMesh.position.set(bX, winY, -roomD / 2 + 0.01);
      windowMesh.rotation.y = 0;
    }
    scene.add(windowMesh);

    if (curtainsAdded && roomType !== RoomType.BATHROOM && roomType !== RoomType.KITCHEN) {
      const curtainGroup = new THREE.Group();
      const curtainMat = new THREE.MeshStandardMaterial({
        color: getCurtainColor(style),
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 0.9
      });
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, roughness: 0.35, metalness: 0.6 });
      const panelW = Math.max(0.18, Math.min(0.34, actualW * 0.18));
      const panelH = Math.min(roomH - 0.25, actualH + 0.75);
      const panelY = Math.max(panelH / 2 + 0.08, winY);
      const panelInset = 0.036;

      [-1, 1].forEach((side) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 0.035), curtainMat);
        panel.position.set(side * (actualW / 2 + panelW / 2 + 0.045), panelY, 0);
        panel.castShadow = true;
        panel.receiveShadow = true;
        curtainGroup.add(panel);

        for (let i = 0; i < 3; i++) {
          const pleat = new THREE.Mesh(new THREE.BoxGeometry(0.012, panelH * 0.94, 0.012), curtainMat);
          pleat.position.set(panel.position.x + (i - 1) * panelW * 0.24, panelY, 0.026);
          pleat.castShadow = true;
          curtainGroup.add(pleat);
        }
      });

      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, actualW + panelW * 2 + 0.22, 14), rodMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, panelY + panelH / 2 + 0.05, 0.02);
      rod.castShadow = true;
      curtainGroup.add(rod);

      if (windowPosition === 'left') {
        curtainGroup.position.set(-roomW / 2 + panelInset, 0, windowMesh.position.z);
        curtainGroup.rotation.y = Math.PI / 2;
      } else if (windowPosition === 'right') {
        curtainGroup.position.set(roomW / 2 - panelInset, 0, windowMesh.position.z);
        curtainGroup.rotation.y = -Math.PI / 2;
      } else {
        curtainGroup.position.set(windowMesh.position.x, 0, -roomD / 2 + panelInset);
      }
      scene.add(curtainGroup);
    }

    // Cozy area rug on floor
    if (areaRugAdded) {
      const rugW = Math.min(3.6, roomW - 0.8);
      const rugD = Math.min(2.6, roomD - 0.8);
      const rugGeo = new THREE.BoxGeometry(rugW, 0.015, rugD);
      const rugMat = new THREE.MeshStandardMaterial({
        color: getAreaRugColor(style),
        roughness: 0.95,
      });
      const rug = new THREE.Mesh(rugGeo, rugMat);
      rug.position.set(0, 0.007, 0);
      rug.receiveShadow = true;
      scene.add(rug);
    }

    // 4. FURNITURE GROUP (Tailored directly to RoomType)
    const furnitureGroup = new THREE.Group();
    furnitureGroupRef.current = furnitureGroup;

    // Render Sofa, Bed, or Dining Table based on RoomType
    if (roomType === RoomType.LIVING_ROOM) {
      const livingRoomGroup = buildLivingRoomFurniture(style, effectiveCouchMaterial, selectedFurniture, furnitureX, furnitureZ, furnitureRot, furnitureScale, roomW, roomD, sofaType, cushionsAdded);
      furnitureGroup.add(livingRoomGroup);
    } else if (roomType === RoomType.BEDROOM) {
      const bedroomGroup = buildBedroomFurniture(
        style, 
        selectedFurniture, 
        furnitureX, 
        furnitureZ, 
        furnitureRot, 
        furnitureScale, 
        roomW, 
        roomD, 
        customLampsOn || timeOfDay === 'sunset' || timeOfDay === 'night',
        wardrobeAdded,
        lightTemperature,
        bedType
      );
      furnitureGroup.add(bedroomGroup);
    } else if (roomType === RoomType.DINING_ROOM) {
      const diningGroup = buildDiningRoomFurniture(style, selectedFurniture, furnitureX, furnitureZ, furnitureRot, furnitureScale, roomW, roomD, roomHeight / 100);
      furnitureGroup.add(diningGroup);
    } else if (roomType === RoomType.OFFICE) {
      const officeGroup = buildOfficeFurniture(style, selectedFurniture, furnitureX, furnitureZ, furnitureRot, furnitureScale, roomW, roomD);
      furnitureGroup.add(officeGroup);
    } else if (roomType === RoomType.BATHROOM) {
      const bathroomGroup = buildBathroomFurniture(style, selectedFurniture, furnitureX, furnitureZ, furnitureRot, furnitureScale, roomW, roomD);
      furnitureGroup.add(bathroomGroup);

      if (bathroomShowerAdded) {
        const showerGroup = new THREE.Group();
        showerGroup.name = "bathroom_shower";

        // Place it in the back-left corner:
        const showerX = -roomW / 2 + 0.55;
        const showerZ = -roomD / 2 + 0.55;
        showerGroup.position.set(showerX, 0, showerZ);

        const silverChr = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
        const transparentGlass = new THREE.MeshStandardMaterial({ color: 0xddeeed, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        const slateFloor = new THREE.MeshStandardMaterial({ color: 0x3d4147, roughness: 0.65 });

        // 1. Shower floor drain tray (elevated slate platform)
        const trayGeo = new THREE.BoxGeometry(0.85, 0.03, 0.85);
        const tray = new THREE.Mesh(trayGeo, slateFloor);
        tray.position.y = 0.015;
        tray.receiveShadow = true;
        tray.castShadow = true;
        showerGroup.add(tray);

        // 2. Glass corner screens (two panels enclosing the shower tray)
        const glassH = 2.0;
        const panel1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, glassH, 0.85), transparentGlass);
        panel1.position.set(0.42, glassH / 2, 0);
        panel1.castShadow = true;
        showerGroup.add(panel1);

        const panel2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, glassH, 0.02), transparentGlass);
        panel2.position.set(0, glassH / 2, 0.42);
        panel2.castShadow = true;
        showerGroup.add(panel2);

        // Metal frame border
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x222224, metalness: 0.8, roughness: 0.3 });
        const border1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.85), frameMat);
        border1.position.set(0.42, glassH, 0);
        showerGroup.add(border1);

        const border2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 0.03), frameMat);
        border2.position.set(0, glassH, 0.42);
        showerGroup.add(border2);

        // 3. Faucet controller (淋浴水龍頭 mixer valve) on the back-left wall
        const mixerGroup = new THREE.Group();
        mixerGroup.position.set(-0.2, 1.0, -0.41);

        // Chrome back plate
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.01), silverChr);
        mixerGroup.add(plate);

        // Mixer knob/lever
        const lever = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.04), silverChr);
        lever.position.set(0, 0, 0.025);
        lever.rotation.z = Math.PI / 6; // slightly rotated
        mixerGroup.add(lever);

        // Lower outlet spout
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06), silverChr);
        spout.position.set(0, -0.07, 0.02);
        spout.rotation.x = Math.PI / 2;
        mixerGroup.add(spout);

        showerGroup.add(mixerGroup);

        // 4. Main Chrome Shower Riser Pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8), silverChr);
        pole.position.set(-0.2, 0.9, -0.38);
        pole.castShadow = true;
        showerGroup.add(pole);

        // Top curve/arch going forward for overhead rain showerhead
        const topArch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.35), silverChr);
        topArch.position.set(-0.2, 1.8, -0.215);
        topArch.castShadow = true;
        showerGroup.add(topArch);

        // 5. Overhead Rain Showerhead (大花灑)
        const headGroup = new THREE.Group();
        headGroup.position.set(-0.2, 1.76, -0.04);
        
        const headDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.016, 24), silverChr);
        headGroup.add(headDisc);
        
        const headJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.04, 12), silverChr);
        headJoint.position.y = 0.025;
        headGroup.add(headJoint);

        showerGroup.add(headGroup);

        // 6. Handheld Shower Wand (蓮蓬頭) with flexible hose
        const handheldGroup = new THREE.Group();
        handheldGroup.position.set(-0.1, 1.15, -0.38);

        // Wand bracket
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04), silverChr);
        handheldGroup.add(bracket);

        // Angled handheld wand
        const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.16, 12), silverChr);
        wand.rotation.x = Math.PI / 4;
        wand.position.set(0.03, 0.03, 0.03);
        wand.castShadow = true;
        handheldGroup.add(wand);

        // Handheld spray face
        const sprayHead = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.012, 0.03, 12), silverChr);
        sprayHead.rotation.x = Math.PI / 4;
        sprayHead.position.set(0.045, 0.08, 0.075);
        handheldGroup.add(sprayHead);

        showerGroup.add(handheldGroup);

        // Flexible Hose (curves from bottom of mixer valve to bottom of handheld wand)
        const hoseGroup = new THREE.Group();
        const numLinks = 10;
        const hoseMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
        for (let i = 0; i <= numLinks; i++) {
          const t = i / numLinks;
          const lx = -0.2 + (-0.07 - (-0.2)) * t;
          const ly = 0.93 + (1.15 - 0.93) * t - 0.15 * Math.sin(t * Math.PI); // drop loop naturally
          const lz = -0.39 + (-0.35 - (-0.39)) * t;

          const link = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), hoseMat);
          link.position.set(lx, ly, lz);
          hoseGroup.add(link);
        }
        showerGroup.add(hoseGroup);

        // Support movement just like other furniture
        applyInteraction(showerGroup, selectedFurniture === 'bathroom_shower', -roomD/2 + 0.55, furnitureX, furnitureZ, furnitureRot, furnitureScale, 0, -roomW/2 + 0.55);

        furnitureGroup.add(showerGroup);
      }
    } else if (roomType === RoomType.KITCHEN) {
      const kitchenGroup = buildKitchenFurniture(style, selectedFurniture, furnitureX, furnitureZ, furnitureRot, furnitureScale, roomW, roomD);
      furnitureGroup.add(kitchenGroup);
    } else if (roomType === RoomType.STUDIO) {
      const studioGroup = buildStudioFurniture(style, selectedFurniture, furnitureX, furnitureZ, furnitureRot, furnitureScale, roomW, roomD, bedType);
      furnitureGroup.add(studioGroup);
    } else {
      // Fallback
      const fallbackGroup = buildLivingRoomFurniture(style, effectiveCouchMaterial, selectedFurniture, furnitureX, furnitureZ, furnitureRot, furnitureScale, roomW, roomD, sofaType);
      furnitureGroup.add(fallbackGroup);
    }

    // --- ACCENTS: Green Plants (Procedural, Triggered by Preset) ---
    if (plantAdded) {
      const plantGroup = new THREE.Group();
      plantGroup.name = "accent_plant";
      
      // Modern Sleek Ceramic Pot (Pristine Warm Minimalist Ceramic)
      const potGroup = new THREE.Group();
      
      const potOuterGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.45, 24);
      const potMat = new THREE.MeshStandardMaterial({ 
        color: 0xfbfbf9, // Off-white modern clay pot
        roughness: 0.7,
        metalness: 0.05
      });
      const potOuter = new THREE.Mesh(potOuterGeo, potMat);
      potOuter.position.y = 0.225;
      potOuter.castShadow = true;
      potOuter.receiveShadow = true;
      potGroup.add(potOuter);
      
      // Brass rim ring around bottom
      const brassRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.185, 0.181, 0.025, 24),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 })
      );
      brassRim.position.y = 0.0125;
      potGroup.add(brassRim);
      
      plantGroup.add(potGroup);

      // Soil
      const soilGeo = new THREE.CylinderGeometry(0.225, 0.215, 0.04, 16);
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x2b1c11, roughness: 0.95 });
      const soil = new THREE.Mesh(soilGeo, soilMat);
      soil.position.y = 0.43;
      plantGroup.add(soil);

      // Branch/Leaf Materials
      const barkMat = new THREE.MeshStandardMaterial({ color: 0x22552a, roughness: 0.55, metalness: 0.05 });
      // Procedural Lush Green Leaf Canvas Texture Generator (No variegations)
      const createVariegatedLeafTexture = (leafIdx: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Base lush tropical leaf green
        ctx.fillStyle = '#0f3815';
        ctx.fillRect(0, 0, 512, 512);

        // Highlight gradient for organic leaf depth
        const grad = ctx.createRadialGradient(256, 256, 15, 256, 256, 270);
        grad.addColorStop(0, '#1c5625');
        grad.addColorStop(0.6, '#0f3a16');
        grad.addColorStop(1, '#071f0a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // No white spots/variegations - pure healthy deep green leaf (as requested)

        // Draw leaf vein rib lines (crisp yellow-cream veins)
        ctx.strokeStyle = '#d7fcd1';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        // Midrib
        ctx.beginPath();
        ctx.moveTo(256, 475);
        ctx.lineTo(256, 45);
        ctx.stroke();

        // Pinnae / Lateral ribs
        ctx.lineWidth = 2.4;
        const ribsCount = 6;
        for (let j = 0; j < ribsCount; j++) {
          const yPos = 110 + (j / ribsCount) * 310;
          const bendVal = -20 + j * 4.5;
          // Left lateral
          ctx.beginPath();
          ctx.moveTo(256, yPos);
          ctx.quadraticCurveTo(150, yPos - 32, 45 + j * 8, yPos - bendVal);
          ctx.stroke();

          // Right lateral
          ctx.beginPath();
          ctx.moveTo(256, yPos);
          ctx.quadraticCurveTo(362, yPos - 32, 467 - j * 8, yPos - bendVal);
          ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
      };

      // Procedural Alocasia/Monstera Curved Heart-Shape Mesh Sculptor
      const createMonsteraLeaf = (index: number, size: number) => {
        const h = size;
        const w = size * 0.85;
        const leafGeo = new THREE.PlaneGeometry(w, h, 14, 14);
        
        // Pivot shift: position base of leaf at local origin (0, 0, 0)
        leafGeo.translate(0, h / 2, 0);
        
        const posAttr = leafGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i); // range [0, h]
          
          const t = y / h; // normal 0 to 1
          
          let widthFactor = 1.0;
          if (t > 0.45) {
            // Upper half tapers to tip
            widthFactor = Math.sin((1 - t) * Math.PI / 1.15);
          } else {
            // Lower half curves to indent heart lobes
            widthFactor = Math.sin(t * Math.PI / 0.85) * 0.98;
          }
          
          const newX = x * widthFactor;
          posAttr.setX(i, newX);
          
          // Organic curved bend down at tip and rolled cupped edges
          const bendZ = - (Math.abs(newX) * Math.abs(newX)) * 2.8 - (h - y) * 0.28;
          posAttr.setZ(i, bendZ);
        }
        leafGeo.computeVertexNormals();

        const texture = createVariegatedLeafTexture(index);
        const leafMatLocal = new THREE.MeshStandardMaterial({
          map: texture || null,
          roughness: 0.24, // glossy finish like real Monstera leaves
          metalness: 0.05,
          side: THREE.DoubleSide,
          shadowSide: THREE.DoubleSide
        });

        const leafMesh = new THREE.Mesh(leafGeo, leafMatLocal);
        leafMesh.castShadow = true;
        leafMesh.receiveShadow = true;
        return leafMesh;
      };

      // Segmented Stem/Leaf Builder for Variegated Monstera Deliciosa
      const buildLeafyStem = (startX: number, startZ: number, maxH: number, bendX: number, bendZ: number, leafCount: number, stemIdx: number) => {
        const stemGroup = new THREE.Group();
        stemGroup.position.set(startX, 0.43, startZ);

        const segs = 4;
        let lastPt = new THREE.Vector3(0, 0, 0);
        for (let idx = 1; idx <= segs; idx++) {
          const t = idx / segs;
          const curY = maxH * t;
          const curX = bendX * t * t;
          const curZ = bendZ * t * t;
          const segmentLen = maxH / segs;

          // Thick realistic Monstera succulent stalk segments
          const segGeo = new THREE.CylinderGeometry(
            0.024 * (1 - t * 0.35),
            0.030 * (1 - (t - 1/segs) * 0.35),
            segmentLen + 0.005,
            12
          );
          const seg = new THREE.Mesh(segGeo, barkMat);
          seg.position.set((lastPt.x + curX) / 2, lastPt.y + segmentLen / 2, (lastPt.z + curZ) / 2);

          // Point along segment curve
          const dir = new THREE.Vector3(curX - lastPt.x, segmentLen, curZ - lastPt.z).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          seg.setRotationFromQuaternion(quat);
          seg.castShadow = true;
          seg.receiveShadow = true;
          stemGroup.add(seg);

          // Attach large droopy variegated leaves
          if (idx >= 2) {
            const leavesPerSeg = Math.ceil(leafCount / segs);
            for (let l = 0; l < leavesPerSeg; l++) {
              const leafT = (idx - 1 + l / leavesPerSeg) / segs;
              const leafX = bendX * leafT * leafT;
              const leafY = maxH * leafT;
              const leafZ = bendZ * leafT * leafT;

              // Large premium floppy variegated leaf size
              const lSize = 0.25 + 0.16 * leafT;
              const leafMesh = createMonsteraLeaf(stemIdx * 5 + idx * 2 + l, lSize);

              const ringAngle = (l * (Math.PI * 2 / leavesPerSeg) + idx * 1.8 + stemIdx * 1.5) % (Math.PI * 2);
              leafMesh.position.set(leafX, leafY, leafZ);
              
              // Rotate to point gracefully outward and droop down naturalistic
              const leafSeed = stemIdx * 31 + idx * 7 + l * 13;
              const leafPitch = 0.25 + (Math.sin(leafSeed) * 0.5 + 0.5) * 0.15;
              const leafRoll = -0.12 + (Math.sin(leafSeed + 4.7) * 0.5 + 0.5) * 0.24;
              leafMesh.rotation.set(
                leafPitch,
                ringAngle,
                leafRoll
              );
              stemGroup.add(leafMesh);
            }
          }
          lastPt.set(curX, curY, curZ);
        }
        return stemGroup;
      };

      // Generate 3 organic sub-stems for full lush realism!
      plantGroup.add(buildLeafyStem(0, 0, 1.25, 0.16, -0.15, 7, 0)); // Tall central leader stalk
      plantGroup.add(buildLeafyStem(-0.06, 0.05, 0.95, -0.22, 0.12, 5, 1)); // Offshoot left-bending stalk
      plantGroup.add(buildLeafyStem(0.06, -0.05, 0.65, 0.12, 0.18, 4, 2)); // Younger forward-bending stalk

      // Default corner placement left side (dynamic based on roomW / roomD)
      const defaultPlantX = -roomW / 2 + 0.6;
      const defaultPlantZ = roomD / 2 - 0.6;
      plantGroup.position.set(defaultPlantX, 0, plantGroup.name === selectedFurniture ? furnitureZ : defaultPlantZ);
      if (plantGroup.name === selectedFurniture) {
        plantGroup.position.x = furnitureX;
        plantGroup.rotation.y = furnitureRot;
        plantGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(plantGroup);
    }

    // --- ACCENTS: Artisanal Flower Vase (🏺 芙蓉冰裂釉工藝花瓶, Triggered by Preset) ---
    if (vaseAdded) {
      const vaseGroup = new THREE.Group();
      vaseGroup.name = "vase";

      const ceramicMat = new THREE.MeshPhysicalMaterial({
        color: 0xeae6dc, // gorgeous eggshell craquelure glaze
        roughness: 0.12,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 });
      const branchMat = new THREE.MeshStandardMaterial({ color: 0x5a483a, roughness: 0.95 });
      const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffa8be, roughness: 0.6 }); // soft coral cherry blossom pink

      // Tear-drop ceramic base bulb
      const vBulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), ceramicMat);
      vBulb.scale.y = 1.35;
      vBulb.position.y = 0.1;
      vBulb.castShadow = true;
      vaseGroup.add(vBulb);

      // Flared neck
      const vNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.05, 0.12, 16), ceramicMat);
      vNeck.position.y = 0.21;
      vNeck.castShadow = true;
      vaseGroup.add(vNeck);

      // Brass modern neck ring
      const vGoldRim = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.015, 16), brassMat);
      vGoldRim.position.y = 0.27;
      vaseGroup.add(vGoldRim);

      // Delicate slender floral branch structures
      const branchAngles = [Math.PI / 12, -Math.PI / 8, Math.PI / 6];
      const branchHeights = [0.42, 0.36, 0.46];
      branchAngles.forEach((angle, idx) => {
        const branchGeo = new THREE.CylinderGeometry(0.003, 0.005, branchHeights[idx], 8);
        const branch = new THREE.Mesh(branchGeo, branchMat);
        branch.position.set(Math.sin(angle) * 0.08, 0.27 + branchHeights[idx] / 2 - 0.02, Math.cos(angle) * 0.03);
        branch.rotation.z = angle;
        branch.rotation.y = idx * 2.1;
        vaseGroup.add(branch);

        // Blooming blossom nodes on branches
        const blossomCount = 4;
        for (let j = 0; j < blossomCount; j++) {
          const t = (j + 1) / (blossomCount + 1);
          const blossomGeo = new THREE.SphereGeometry(0.015, 8, 8);
          blossomGeo.scale(1.2, 0.8, 1.2);
          const blossom = new THREE.Mesh(blossomGeo, flowerMat);

          const localY = (t - 0.5) * branchHeights[idx];
          
          blossom.position.set(
            branch.position.x + Math.sin(angle) * localY + (j % 2 === 0 ? 0.02 : -0.02),
            branch.position.y + Math.cos(angle) * localY,
            branch.position.z + (j % 2 === 0 ? 0.022 : -0.018)
          );
          vaseGroup.add(blossom);
        }
      });

      // Default positioning on table/desk or vanity shelf
      const defaultVaseX = -0.4;
      const defaultVaseZ = 0.1;
      const defaultHeight = (roomType === RoomType.BEDROOM) ? 0.55 : 0.74;

      vaseGroup.position.set(defaultVaseX, defaultHeight, vaseGroup.name === selectedFurniture ? furnitureZ : defaultVaseZ);
      if (vaseGroup.name === selectedFurniture) {
        vaseGroup.position.x = furnitureX;
        vaseGroup.rotation.y = furnitureRot;
        vaseGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        vaseGroup.position.y = defaultHeight;
      }
      furnitureGroup.add(vaseGroup);
    }

    // --- ACCENTS: Radial Modernist Wall Clock (🕰️ 現代輕奢金屬掛鐘) ---
    if (clockAdded) {
      const clockGroup = new THREE.Group();
      clockGroup.name = "clock";

      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1d1e22, metalness: 0.8, roughness: 0.2 }); 
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xc5a059, metalness: 0.9, roughness: 0.15 }); 
      const faceMat = new THREE.MeshStandardMaterial({ color: 0xfbfbf9, roughness: 0.4 });
      const handMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });

      // Outer casing
      const outerCasingGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 32);
      outerCasingGeo.rotateX(Math.PI / 2);
      const outerCasing = new THREE.Mesh(outerCasingGeo, frameMat);
      outerCasing.castShadow = true;
      clockGroup.add(outerCasing);

      // Gold rim
      const innerRimGeo = new THREE.CylinderGeometry(0.224, 0.224, 0.042, 32);
      innerRimGeo.rotateX(Math.PI / 2);
      const innerRim = new THREE.Mesh(innerRimGeo, rimMat);
      clockGroup.add(innerRim);

      // White face
      const faceGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.03, 32);
      faceGeo.rotateX(Math.PI / 2);
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.z = 0.01;
      clockGroup.add(face);

      // Hour ticks (12 divisions)
      for (let i = 0; i < 12; i++) {
        const radius = 0.175;
        const tickAngle = (i * Math.PI) / 6;
        const tickW = (i % 3 === 0) ? 0.008 : 0.004;
        const tickH = (i % 3 === 0) ? 0.032 : 0.018;
        const tickGeo = new THREE.BoxGeometry(tickW, tickH, 0.005);
        const tick = new THREE.Mesh(tickGeo, handMat);
        tick.position.set(Math.sin(tickAngle) * radius, Math.cos(tickAngle) * radius, 0.026);
        tick.rotation.z = -tickAngle;
        clockGroup.add(tick);
      }

      // Hour hand (set at 10:10 display)
      const hrAngle = (10 * Math.PI) / 6 + (10 * Math.PI) / 360; 
      const hrHandGeo = new THREE.BoxGeometry(0.008, 0.09, 0.005);
      const hrHand = new THREE.Mesh(hrHandGeo, handMat);
      hrHand.position.set(Math.sin(hrAngle) * 0.035, Math.cos(hrAngle) * 0.035, 0.028);
      hrHand.rotation.z = -hrAngle;
      clockGroup.add(hrHand);

      // Minute hand (set at 10past)
      const minAngle = (2 * Math.PI) / 6;
      const minHandGeo = new THREE.BoxGeometry(0.005, 0.13, 0.005);
      const minHand = new THREE.Mesh(minHandGeo, handMat);
      minHand.position.set(Math.sin(minAngle) * 0.055, Math.cos(minAngle) * 0.055, 0.029);
      minHand.rotation.z = -minAngle;
      clockGroup.add(minHand);

      // Gold center rivet
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), rimMat);
      pin.position.z = 0.031;
      clockGroup.add(pin);

      const defaultClockX = -1.1; 
      const defaultClockZ = -roomD / 2 + 0.025; // Flush against back wall
      const defaultHeight = 1.9; // Clear height

      clockGroup.position.set(defaultClockX, defaultHeight, clockGroup.name === selectedFurniture ? furnitureZ : defaultClockZ);
      if (clockGroup.name === selectedFurniture) {
        clockGroup.position.x = furnitureX;
        clockGroup.rotation.y = furnitureRot;
        clockGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        clockGroup.position.y = defaultHeight;
      }
      furnitureGroup.add(clockGroup);
    }

    // --- ACCENTS: Round metal-framed wall mirror ---
    if (wallMirrorAdded && roomType !== RoomType.BATHROOM && roomType !== RoomType.KITCHEN) {
      const mirrorGroup = createWallMirrorMesh(style);
      mirrorGroup.name = "wall_mirror";
      const defaults = getFurnitureDefaults(roomType, "wall_mirror");
      const defaultHeight = 1.55;

      mirrorGroup.position.set(defaults.x, defaultHeight, mirrorGroup.name === selectedFurniture ? furnitureZ : defaults.z);
      if (mirrorGroup.name === selectedFurniture) {
        mirrorGroup.position.x = furnitureX;
        mirrorGroup.rotation.y = furnitureRot;
        mirrorGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        mirrorGroup.position.y = defaultHeight;
      } else {
        mirrorGroup.rotation.y = defaults.rot;
      }
      furnitureGroup.add(mirrorGroup);
    }

    // --- FURNITURE: Slatted Cherry Wood Shoe Cabinet (👞 經典櫻桃木格柵對開鞋櫃) ---
    if (shoeCabinetAdded) {
      const cabinetGroup = new THREE.Group();
      cabinetGroup.name = "shoe_cabinet";

      const woodColor = 0x8a543b; // Warm luxury cherry wood
      const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.55 });
      const handlesMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 }); 
      const feetMat = new THREE.MeshStandardMaterial({ color: 0x1d1e22, metalness: 0.5, roughness: 0.4 }); 

      // Cabinet main enclosure
      const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.92, 0.38), woodMat);
      mainBody.position.y = 0.58; // sits on 0.12m feet
      mainBody.castShadow = true;
      mainBody.receiveShadow = true;
      cabinetGroup.add(mainBody);

      // Overhanging top decorative plate
      const topPanel = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.035, 0.40), woodMat);
      topPanel.position.y = 1.055;
      topPanel.castShadow = true;
      cabinetGroup.add(topPanel);

      // Door vertical fluting grooved slates
      const slatMat = new THREE.MeshStandardMaterial({ color: woodColor - 0x181008, roughness: 0.65 });
      const slatW = 0.02;
      const slatD = 0.01;
      const slatH = 0.88;
      // Left door slats
      for (let i = 0; i < 6; i++) {
        const slatL = new THREE.Mesh(new THREE.BoxGeometry(slatW, slatH, slatD), slatMat);
        slatL.position.set(-0.35 + i * 0.06, 0.58, 0.192);
        cabinetGroup.add(slatL);
      }
      // Right door slats
      for (let i = 0; i < 6; i++) {
        const slatR = new THREE.Mesh(new THREE.BoxGeometry(slatW, slatH, slatD), slatMat);
        slatR.position.set(0.05 + i * 0.06, 0.58, 0.192);
        cabinetGroup.add(slatR);
      }

      // Slender designer vertical handles
      const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 12), handlesMat);
      handleL.position.set(-0.025, 0.65, 0.205);
      handleL.castShadow = true;
      cabinetGroup.add(handleL);

      const handleR = handleL.clone();
      handleR.position.x = 0.025;
      cabinetGroup.add(handleR);

      // Elegant tapered metal feet with brass boots
      const footOffsets = [
        [-0.38, -0.17],
        [0.38, -0.17],
        [-0.38, 0.17],
        [0.38, 0.17]
      ];
      footOffsets.forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.12, 12), feetMat);
        foot.position.set(fx, 0.06, fz);
        foot.castShadow = true;
        cabinetGroup.add(foot);

        const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.03, 12), handlesMat);
        boot.position.set(fx, 0.015, fz);
        cabinetGroup.add(boot);
      });

      // Key tray on top of cabinet
      const trayMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.1, roughness: 0.8 }); 
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.16), trayMat);
      tray.position.set(-0.2, 1.08, 0.05);
      cabinetGroup.add(tray);

      const brassKeys = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 8, 12), handlesMat);
      brassKeys.rotation.x = Math.PI / 2;
      brassKeys.position.set(-0.2, 1.09, 0.05);
      cabinetGroup.add(brassKeys);

      const defaultCobX = roomW / 2 - 0.35;
      const defaultCobZ = roomD / 2 - 1.0;
      const defaultHeight = 0; 

      cabinetGroup.position.set(defaultCobX, defaultHeight, cabinetGroup.name === selectedFurniture ? furnitureZ : defaultCobZ);
      if (cabinetGroup.name === selectedFurniture) {
        cabinetGroup.position.x = furnitureX;
        cabinetGroup.rotation.y = furnitureRot;
        cabinetGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        cabinetGroup.position.y = defaultHeight;
      }
      cabinetGroup.castShadow = true;
      cabinetGroup.receiveShadow = true;
      furnitureGroup.add(cabinetGroup);
    }

    // --- ACCENTS: Painting Framing (牆壁藝術, Triggered by Preset) ---
    if (artworkAdded) {
      // --- Modern Geometric Abstract Painting ---
      // z-layer plan (center positions, each layer's FRONT face must be ahead of previous):
      // frameOuter  : z=0.000, d=0.060  → front=+0.030
      // bevelStrip  : z=0.033, d=0.004  → front=+0.035  (gold insert flush with frame face)
      // canvas      : z=0.042, d=0.016  → front=+0.050, back=+0.034  (clear of bevel front)
      // paint layers start at z=0.056 with 0.006 step per layer
      const artGroup = new THREE.Group();
      artGroup.name = "accent_artwork";

      const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x2a1f14, metalness: 0.65, roughness: 0.25 });
      const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.18, 0.060), bronzeMat);
      frameOuter.castShadow = true;
      artGroup.add(frameOuter);

      // Gold bevel insert (thin strip, clearly in front of frame)
      const bevelMat = new THREE.MeshStandardMaterial({ color: 0xc9a96e, metalness: 0.8, roughness: 0.2 });
      const bevel = new THREE.Mesh(new THREE.BoxGeometry(1.60, 1.06, 0.004), bevelMat);
      bevel.position.z = 0.033; // front = 0.035
      artGroup.add(bevel);

      // Canvas (cream linen)
      const canvasMat = new THREE.MeshStandardMaterial({ color: 0xf0ebe0, roughness: 0.92, metalness: 0 });
      const canvas = new THREE.Mesh(new THREE.BoxGeometry(1.54, 1.00, 0.016), canvasMat);
      canvas.position.z = 0.042; // front = 0.050, back = 0.034 — clear of bevel
      artGroup.add(canvas);

      // Paint layers: z0=0.056, step=+0.006 per logical layer
      // Layer 0 (z=0.056): background (navy half)
      // Layer 1 (z=0.062): diagonal gold strip + charcoal rect (different XY, no overlap)
      // Layer 2 (z=0.068): terracotta circle
      // Layer 3 (z=0.074): ivory inner circle + gold bar (different XY, no overlap)
      // Layer 4 (z=0.080): pencil lines + accent square
      const L0 = 0.056;
      const L1 = 0.062;
      const L2 = 0.068;
      const L3 = 0.074;
      const L4 = 0.080;

      // Layer 0 — navy background half
      const navyMat = new THREE.MeshBasicMaterial({ color: 0x1b2a4a });
      const navyBg = new THREE.Mesh(new THREE.BoxGeometry(0.77, 1.00, 0.006), navyMat);
      navyBg.position.set(-0.385, 0, L0);
      artGroup.add(navyBg);

      // Layer 1 — diagonal gold strip
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a843, metalness: 0.3, roughness: 0.5 });
      const diagStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.42, 0.006), goldMat);
      diagStrip.position.set(-0.01, 0, L1);
      diagStrip.rotation.z = 0.38;
      artGroup.add(diagStrip);

      // Layer 1 — charcoal rect right side (same z, different XY — no overlap)
      const charcoalMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
      const boldRect = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.006), charcoalMat);
      boldRect.position.set(0.42, -0.1, L1);
      artGroup.add(boldRect);

      // Layer 2 — terracotta circle
      const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xc0613a, roughness: 0.7 });
      const circle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.006, 32), terracottaMat);
      circle.rotation.x = Math.PI / 2;
      circle.position.set(-0.18, 0.06, L2);
      artGroup.add(circle);

      // Layer 3 — ivory inner circle
      const ivoryMat = new THREE.MeshBasicMaterial({ color: 0xf0ebe0 });
      const innerCircle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.006, 32), ivoryMat);
      innerCircle.rotation.x = Math.PI / 2;
      innerCircle.position.set(-0.18, 0.06, L3);
      artGroup.add(innerCircle);

      // Layer 3 — gold horizontal bar (same z, different XY — no overlap)
      const goldBar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.006), goldMat);
      goldBar.position.set(0.42, 0.24, L3);
      artGroup.add(goldBar);

      // Layer 4 — pencil lines
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x888070 });
      [-0.3, -0.05, 0.2].forEach(ly => {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.007, 0.005), lineMat);
        line.position.set(0.37, ly, L4);
        artGroup.add(line);
      });

      // Layer 4 — gold accent square (same z, different XY — no overlap)
      const accentSq = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.005), goldMat);
      accentSq.position.set(0.60, -0.38, L4);
      artGroup.add(accentSq);

      // Hanging wire (behind everything, at frame depth)
      const wireMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 });
      const wire = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.006, 0.004), wireMat);
      wire.position.set(0, 0.57, 0.032);
      artGroup.add(wire);

      const defaultArtZ = -roomD / 2 + 0.03;
      const defaultArtY = Math.max(1.5, roomH * 0.56);
      artGroup.position.set(0, defaultArtY, artGroup.name === selectedFurniture ? furnitureZ : defaultArtZ);
      if (artGroup.name === selectedFurniture) {
        artGroup.position.x = furnitureX;
        artGroup.rotation.y = furnitureRot;
        artGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(artGroup);
    }

    // --- ARTWORK: Morandi Botanical Print ---
    if (botanicalPrintAdded) {
      const botGroup = new THREE.Group();
      botGroup.name = "botanical_print";

      // Natural ash-wood frame
      const ashFrameMat = new THREE.MeshStandardMaterial({ color: 0xc9b89a, roughness: 0.75, metalness: 0 });
      botGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.44, 0.05), ashFrameMat));
      // Inner mat border (cream)
      const matMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f0, roughness: 0.95 });
      const matBoard = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.36, 0.03), matMat);
      matBoard.position.z = 0.012;
      botGroup.add(matBoard);
      // Canvas
      const botCanvas = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.20, 0.018), new THREE.MeshStandardMaterial({ color: 0xf8f4ec, roughness: 0.98 }));
      botCanvas.position.z = 0.025;
      botGroup.add(botCanvas);

      const bz = 0.036;
      // Sage green vertical stem 1
      const sageMat = new THREE.MeshBasicMaterial({ color: 0x7a9e7e });
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xe8c4b8 });
      const dustMat = new THREE.MeshBasicMaterial({ color: 0xc8bfb0 });

      // Stems (thin rectangles)
      const stem1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.72, 0.002), sageMat);
      stem1.position.set(-0.18, -0.08, bz);
      botGroup.add(stem1);
      const stem2 = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.55, 0.002), sageMat);
      stem2.position.set(0.08, -0.18, bz);
      stem2.rotation.z = 0.15;
      botGroup.add(stem2);
      const stem3 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.40, 0.002), dustMat);
      stem3.position.set(0.26, -0.22, bz);
      stem3.rotation.z = -0.22;
      botGroup.add(stem3);

      // Oval leaves (thin flattened boxes at slight angles)
      const leafDefs = [
        { x: -0.26, y: 0.22, rz: -0.6, w: 0.14, h: 0.08, mat: sageMat },
        { x: -0.10, y: 0.32, rz: 0.3, w: 0.12, h: 0.07, mat: sageMat },
        { x: -0.20, y: 0.08, rz: -1.1, w: 0.18, h: 0.07, mat: sageMat },
        { x: 0.04,  y: 0.25, rz: 0.8, w: 0.13, h: 0.065, mat: sageMat },
        { x: 0.20,  y: 0.15, rz: -0.5, w: 0.10, h: 0.055, mat: dustMat },
        { x: 0.30,  y: 0.05, rz: 1.2, w: 0.09, h: 0.05, mat: dustMat },
      ];
      leafDefs.forEach(({ x, y, rz, w, h, mat }) => {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.003), mat);
        leaf.position.set(x, y, bz + 0.001);
        leaf.rotation.z = rz;
        botGroup.add(leaf);
      });

      // Small round flower heads (cylinders)
      const flowerDefs = [
        { x: -0.18, y: 0.37, r: 0.045, mat: blushMat },
        { x: -0.12, y: 0.48, r: 0.035, mat: blushMat },
        { x: 0.08,  y: 0.42, r: 0.038, mat: blushMat },
        { x: 0.28,  y: 0.30, r: 0.030, mat: dustMat },
      ];
      flowerDefs.forEach(({ x, y, r, mat }) => {
        const flower = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.003, 16), mat);
        flower.rotation.x = Math.PI / 2;
        flower.position.set(x, y, bz + 0.002);
        botGroup.add(flower);
      });

      // Thin botanical label line at bottom (decorative)
      const labelLine = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.005, 0.002), dustMat);
      labelLine.position.set(0, -0.52, bz + 0.002);
      botGroup.add(labelLine);

      const defBotZ = -roomD / 2 + 0.03;
      const defBotY = Math.max(1.5, roomH * 0.57);
      botGroup.position.set(-roomW / 4, defBotY, botGroup.name === selectedFurniture ? furnitureZ : defBotZ);
      if (botGroup.name === selectedFurniture) {
        botGroup.position.x = furnitureX;
        botGroup.rotation.y = furnitureRot;
        botGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(botGroup);
    }

    // --- ARTWORK: Abstract Expressionist Oil Painting ---
    if (abstractOilAdded) {
      const oilGroup = new THREE.Group();
      oilGroup.name = "abstract_oil";

      // Thick dark steel frame (museum quality)
      const steelFrameMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: 0.55, roughness: 0.3 });
      oilGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.22, 0.07), steelFrameMat));
      // Canvas: deep forest background
      const oilBg = new THREE.Mesh(new THREE.BoxGeometry(1.50, 1.10, 0.025), new THREE.MeshStandardMaterial({ color: 0x1e3a2f, roughness: 0.88 }));
      oilBg.position.z = 0.028;
      oilGroup.add(oilBg);

      const oz = 0.042;

      // Large impasto-feel diagonal slabs (simulate thick oil brushstrokes)
      const vermillionMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.82, metalness: 0 });
      const cadYellowMat = new THREE.MeshStandardMaterial({ color: 0xe8b84b, roughness: 0.78 });
      const titanWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.85 });
      const cobaltMat = new THREE.MeshStandardMaterial({ color: 0x2c4a7c, roughness: 0.80 });
      const umber = new THREE.MeshStandardMaterial({ color: 0x6b3e26, roughness: 0.90 });

      // Broad vermillion brushstroke (dominant diagonal)
      const stroke1 = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.28, 0.006), vermillionMat);
      stroke1.position.set(-0.1, 0.18, oz);
      stroke1.rotation.z = 0.22;
      oilGroup.add(stroke1);

      // Cadmium yellow burst (upper right)
      const stroke2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.20, 0.007), cadYellowMat);
      stroke2.position.set(0.40, 0.28, oz + 0.001);
      stroke2.rotation.z = -0.35;
      oilGroup.add(stroke2);

      // Titanium white impasto over stroke2
      const stroke3 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.008), titanWhiteMat);
      stroke3.position.set(0.44, 0.30, oz + 0.003);
      stroke3.rotation.z = -0.18;
      oilGroup.add(stroke3);

      // Deep cobalt ground stroke (lower left)
      const stroke4 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.005), cobaltMat);
      stroke4.position.set(-0.35, -0.25, oz);
      stroke4.rotation.z = 0.12;
      oilGroup.add(stroke4);

      // Raw umber mid-ground dark anchor
      const stroke5 = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.16, 0.005), umber);
      stroke5.position.set(0.05, -0.05, oz);
      stroke5.rotation.z = -0.08;
      oilGroup.add(stroke5);

      // White accent strokes (texture highlights)
      [[0.28, 0.10], [-0.45, 0.05], [0.60, -0.18]].forEach(([wx, wy]) => {
        const wStroke = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.007), titanWhiteMat);
        wStroke.position.set(wx, wy, oz + 0.004);
        wStroke.rotation.z = (wx > 0 ? 0.3 : -0.2);
        oilGroup.add(wStroke);
      });

      // Cadmium accent drip (narrow vertical stroke)
      const drip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.38, 0.006), cadYellowMat);
      drip.position.set(-0.22, -0.12, oz + 0.002);
      drip.rotation.z = 0.05;
      oilGroup.add(drip);

      const defOilZ = -roomD / 2 + 0.035;
      const defOilY = Math.max(1.5, roomH * 0.55);
      oilGroup.position.set(roomW / 4, defOilY, oilGroup.name === selectedFurniture ? furnitureZ : defOilZ);
      if (oilGroup.name === selectedFurniture) {
        oilGroup.position.x = furnitureX;
        oilGroup.rotation.y = furnitureRot;
        oilGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(oilGroup);
    }

    // --- ARTWORK: Japanese Ink Scroll (掛軸) ---
    if (japanInkAdded) {
      const inkGroup = new THREE.Group();
      inkGroup.name = "japan_ink";

      // Top wooden dowel (round, dark lacquer)
      const lacquerMat = new THREE.MeshStandardMaterial({ color: 0x1a0f0a, roughness: 0.3, metalness: 0.1 });
      const topDowel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.08, 16), lacquerMat);
      topDowel.rotation.z = Math.PI / 2;
      topDowel.position.set(0, 0.72, 0);
      inkGroup.add(topDowel);
      // Dowel end caps
      [-0.54, 0.54].forEach(ex => {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16), lacquerMat);
        cap.rotation.z = Math.PI / 2;
        cap.position.set(ex, 0.72, 0);
        inkGroup.add(cap);
      });
      // Bottom dowel
      const botDowel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.04, 16), lacquerMat);
      botDowel.rotation.z = Math.PI / 2;
      botDowel.position.set(0, -0.72, 0);
      inkGroup.add(botDowel);
      [-0.52, 0.52].forEach(ex => {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.04, 16), lacquerMat);
        cap.rotation.z = Math.PI / 2;
        cap.position.set(ex, -0.72, 0);
        inkGroup.add(cap);
      });

      // Scroll paper: aged warm cream
      const scrollMat = new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: 0.96 });
      const scroll = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.38, 0.015), scrollMat);
      scroll.position.z = 0.008;
      inkGroup.add(scroll);

      const iz = 0.022;

      // Mountain silhouettes — layered from back to front (darker = farther)
      const inkBlack = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
      const inkGray1 = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
      const inkGray2 = new THREE.MeshBasicMaterial({ color: 0x787878 });
      const inkGray3 = new THREE.MeshBasicMaterial({ color: 0xa8a8a8 });

      // Far distant peak (palest, widest)
      const mtn4 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.002), inkGray3);
      mtn4.position.set(0, 0.10, iz);
      inkGroup.add(mtn4);
      const mtn4peak = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.002), inkGray3);
      mtn4peak.position.set(0.08, 0.20, iz);
      inkGroup.add(mtn4peak);

      // Mid mountains
      const mtn3 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.28, 0.002), inkGray2);
      mtn3.position.set(-0.08, 0.06, iz + 0.001);
      inkGroup.add(mtn3);
      const mtn3peak = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.002), inkGray2);
      mtn3peak.position.set(-0.14, 0.22, iz + 0.001);
      inkGroup.add(mtn3peak);

      // Near mountain (medium gray)
      const mtn2 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.002), inkGray1);
      mtn2.position.set(0.18, -0.02, iz + 0.002);
      inkGroup.add(mtn2);
      const mtn2peak = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.002), inkGray1);
      mtn2peak.position.set(0.22, 0.18, iz + 0.002);
      inkGroup.add(mtn2peak);

      // Foreground dark mass (earth/ground)
      const ground = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.20, 0.003), inkBlack);
      ground.position.set(0, -0.52, iz + 0.003);
      inkGroup.add(ground);

      // Pine tree silhouette (left)
      const treeTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.30, 0.003), inkBlack);
      treeTrunk.position.set(-0.30, -0.28, iz + 0.003);
      inkGroup.add(treeTrunk);
      [0.04, 0.10, 0.16].forEach((ty, ti) => {
        const branch = new THREE.Mesh(new THREE.BoxGeometry(0.14 - ti * 0.03, 0.012, 0.002), inkBlack);
        branch.position.set(-0.30, -0.10 + ty, iz + 0.004);
        inkGroup.add(branch);
      });

      // Thin horizon ink wash line
      const horizon = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.006, 0.002), inkGray1);
      horizon.position.set(0, -0.08, iz + 0.002);
      inkGroup.add(horizon);

      // Red artist seal (small cylinder, bottom right)
      const sealMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
      const seal = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.003), sealMat);
      seal.position.set(0.38, -0.60, iz + 0.004);
      inkGroup.add(seal);

      // Hanging cords
      const cordMat = new THREE.MeshBasicMaterial({ color: 0x7a6a5a });
      [-0.38, 0.38].forEach(cx => {
        const cord = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.22, 0.002), cordMat);
        cord.position.set(cx, 0.83, 0.005);
        inkGroup.add(cord);
      });

      const defInkZ = -roomD / 2 + 0.02;
      const defInkY = Math.max(1.6, roomH * 0.58);
      inkGroup.position.set(0, defInkY, inkGroup.name === selectedFurniture ? furnitureZ : defInkZ);
      if (inkGroup.name === selectedFurniture) {
        inkGroup.position.x = furnitureX;
        inkGroup.rotation.y = furnitureRot;
        inkGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(inkGroup);
    }

    // --- ACCENT: Standalone Wardrobe (cross-room, shown when not in bedroom) ---
    if (wardrobeAdded && roomType !== RoomType.BEDROOM) {
      const wdGroup = new THREE.Group();
      wdGroup.name = "wardrobe";

      const woodMat = new THREE.MeshStandardMaterial({ color: 0xc9b89a, roughness: 0.72 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });

      // Cabinet body
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.95, 0.58), woodMat);
      body.position.y = 0.975; body.castShadow = true;
      wdGroup.add(body);
      // Split groove
      const split = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1.9, 0.585), new THREE.MeshStandardMaterial({ color: 0x181008, roughness: 0.9 }));
      split.position.set(0, 0.975, 0.001);
      wdGroup.add(split);
      // Door frames
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.01), new THREE.MeshStandardMaterial({ color: 0xb8a88a, roughness: 0.75 }));
      frameL.position.set(-0.28, 0.975, 0.286);
      wdGroup.add(frameL);
      const frameR = frameL.clone(); frameR.position.x = 0.28;
      wdGroup.add(frameR);
      // Handles
      const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.015), trimMat);
      handleL.position.set(-0.04, 1.0, 0.292); handleL.castShadow = true;
      wdGroup.add(handleL);
      const handleR = handleL.clone(); handleR.position.x = 0.04;
      wdGroup.add(handleR);
      // Top molding
      const topMold = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.04, 0.62), woodMat);
      topMold.position.y = 1.965;
      wdGroup.add(topMold);
      // Base plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.58), new THREE.MeshStandardMaterial({ color: 0xb8a88a, roughness: 0.75 }));
      plinth.position.y = 0.03;
      wdGroup.add(plinth);

      const defWdZ = roomD / 2 - 0.35;
      const defWdX = -roomW / 2 + 0.65;
      wdGroup.position.set(
        wdGroup.name === selectedFurniture ? furnitureX : defWdX,
        0,
        wdGroup.name === selectedFurniture ? furnitureZ : defWdZ
      );
      if (wdGroup.name === selectedFurniture) {
        wdGroup.rotation.y = furnitureRot;
        wdGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(wdGroup);
    }

    // --- ACCENTS: Luxury Glass Wine Cabinet / Display Case ---
    if (wineCabinetAdded) {
      const cabinetGroup = new THREE.Group();
      cabinetGroup.name = "wine_cabinet";

      // Outer chassis framework (matte charcoal structure)
      const carbonMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.8, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.2 })
      );
      carbonMesh.position.y = 0.9;
      cabinetGroup.add(carbonMesh);

      // Skeleton corners (4 slim metallic bronze columns)
      const colMat = new THREE.MeshStandardMaterial({ color: 0xc49a45, metalness: 0.8, roughness: 0.2 });
      for (const [cx, cz] of [[-0.34, -0.2], [-0.34, 0.2], [0.34, -0.2], [0.34, 0.2]]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.8, 6), colMat);
        col.position.set(cx, 0.9, cz);
        cabinetGroup.add(col);
      }

      // Three elegant glass shelves (at y = 0.45, y = 0.9, y = 1.35)
      const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3a4843, transparent: true, opacity: 0.6, roughness: 0.1 });
      for (const sy of [0.45, 0.9, 1.35]) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.015, 0.38), shelfMat);
        shelf.position.set(0, sy, 0);
        cabinetGroup.add(shelf);

        // Put some decorative cylindrical wine bottles on each shelf lying down!
        const bMat = new THREE.MeshStandardMaterial({ color: 0x1a331a, roughness: 0.1 });
        const goldNeck = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.1 });
        for (let idx = 0; idx < 3; idx++) {
          const bGroup = new THREE.Group();
          const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), bMat);
          bottle.rotation.x = Math.PI / 2;
          bottle.position.set(-0.15 + idx * 0.15, sy + 0.035, 0);
          bGroup.add(bottle);

          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), goldNeck);
          neck.rotation.x = Math.PI / 2;
          neck.position.set(-0.15 + idx * 0.15, sy + 0.035, 0.1);
          bGroup.add(neck);

          cabinetGroup.add(bGroup);
        }
      }

      // Default corner placement near dining/kitchen/living area
      const defaultCabX = roomW / 2 - 0.4;
      const defaultCabZ = -roomD / 2 + 0.8;
      cabinetGroup.position.set(defaultCabX, 0, cabinetGroup.name === selectedFurniture ? furnitureZ : defaultCabZ);
      if (cabinetGroup.name === selectedFurniture) {
        cabinetGroup.position.x = furnitureX;
        cabinetGroup.rotation.y = furnitureRot;
        cabinetGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      } else {
        cabinetGroup.rotation.y = -Math.PI / 2;
      }
      furnitureGroup.add(cabinetGroup);
    }

    // --- ACCENTS: Nordic Wood Cat Climbing Tower ---
    if (catTowerAdded) {
      const catGroup = new THREE.Group();
      catGroup.name = "cat_tower";

      const woodMat = new THREE.MeshStandardMaterial({ color: 0xe0cda9, roughness: 0.7 }); // natural light pine
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc2a678, roughness: 0.9 }); // sisal cord look

      // circular base platform
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12), woodMat);
      base.position.y = 0.02;
      base.castShadow = true;
      catGroup.add(base);

      // main rope wrapped central column
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.25, 8), ropeMat);
      col.position.y = 0.645;
      col.castShadow = true;
      catGroup.add(col);

      // mid tier shelf plate 1 (y = 0.5)
      const pl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 10), woodMat);
      pl1.position.set(-0.1, 0.5, 0.05);
      pl1.castShadow = true;
      catGroup.add(pl1);

      // top tier tray nest 2 (y = 1.0)
      const pl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10), woodMat);
      pl2.position.set(0.08, 1.0, -0.05);
      pl2.castShadow = true;
      catGroup.add(pl2);

      const pl2Ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 12), woodMat);
      pl2Ring.rotation.x = Math.PI / 2;
      pl2Ring.position.set(0.08, 1.05, -0.05);
      pl2Ring.castShadow = true;
      catGroup.add(pl2Ring);

      // Default corner placement (front right corner)
      const defaultCatX = roomW / 2 - 0.7;
      const defaultCatZ = roomD / 2 - 0.7;
      catGroup.position.set(defaultCatX, 0, catGroup.name === selectedFurniture ? furnitureZ : defaultCatZ);
      if (catGroup.name === selectedFurniture) {
        catGroup.position.x = furnitureX;
        catGroup.rotation.y = furnitureRot;
        catGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(catGroup);
    }

    // --- ACCENTS: Mobile Champagne / Beverage Cart ---
    if (barCartAdded) {
      const cartGroup = new THREE.Group();
      cartGroup.name = "bar_cart";

      const goldMat = new THREE.MeshStandardMaterial({ color: 0xe5ba4f, metalness: 0.9, roughness: 0.15 }); // brass gold
      const marbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }); // pristine marble slabs

      // bottom shelf at y = 0.1
      const tierBottom = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.38), marbleMat);
      tierBottom.position.y = 0.12;
      tierBottom.castShadow = true;
      cartGroup.add(tierBottom);

      // top shelf at y = 0.7
      const tierTop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.38), marbleMat);
      tierTop.position.y = 0.72;
      tierTop.castShadow = true;
      cartGroup.add(tierTop);

      // 4 golden vertical rods/bars connecting them
      for (const [rx, rz] of [[-0.27, -0.18], [-0.27, 0.18], [0.27, -0.18], [0.27, 0.18]]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.78, 8), goldMat);
        rod.position.set(rx, 0.39, rz);
        cartGroup.add(rod);
      }

      // Rounded gold push handle
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.38, 8), goldMat);
      hBar.rotation.x = Math.PI / 2;
      hBar.position.set(-0.275, 0.78, 0);
      cartGroup.add(hBar);

      // Tiny caster wheels at bottom
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
      for (const [wx, wz] of [[-0.24, -0.16], [-0.24, 0.16], [0.24, -0.16], [0.24, 0.16]]) {
        const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), wheelMat);
        wheel.position.set(wx, 0.04, wz);
        cartGroup.add(wheel);
      }

      // Add a couple of golden glasses and cylindrical liquor decanters to top shelf
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xeeffff, transparent: true, opacity: 0.7, roughness: 0.02 });
      const bottle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), glassMat);
      bottle1.position.set(0.12, 0.81, -0.06);
      cartGroup.add(bottle1);

      const bottle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xda9b20, metalness: 0.6, roughness: 0.1 }));
      bottle2.position.set(0.18, 0.82, 0.06);
      cartGroup.add(bottle2);

      // Default corner placement (front-left area)
      const defaultCartX = -roomW / 2 + 0.8;
      const defaultCartZ = roomD / 2 - 1.2;
      cartGroup.position.set(defaultCartX, 0, cartGroup.name === selectedFurniture ? furnitureZ : defaultCartZ);
      if (cartGroup.name === selectedFurniture) {
        cartGroup.position.x = furnitureX;
        cartGroup.rotation.y = furnitureRot;
        cartGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(cartGroup);
    }

    // --- ACCENTS: Curved Modernist Floor Lamp (Decoupled, Positionable, Inward-oriented) ---
    if (floorLampAdded) {
      const lampStandGroup = new THREE.Group();
      lampStandGroup.name = "accent_lamp";

      const metallicMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.85, roughness: 0.15 });
      const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
      const paperShadeMat = new THREE.MeshStandardMaterial({ color: 0xfffcf7, roughness: 0.9 });

      // Round heavy base
      const lBaseGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 24);
      const lBase = new THREE.Mesh(lBaseGeo, metallicMat);
      lBase.position.y = 0.02;
      lBase.castShadow = true;
      lBase.receiveShadow = true;
      lampStandGroup.add(lBase);

      // Vertical Pole
      const lPoleGeo = new THREE.CylinderGeometry(0.014, 0.016, 1.75, 12);
      const lPole = new THREE.Mesh(lPoleGeo, metallicMat);
      lPole.position.y = 0.875;
      lPole.castShadow = true;
      lampStandGroup.add(lPole);

      // Curved/Horizontal metal cantilever arm (connects vertical pole to shade) - points along local +X
      const lArmGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.35, 8);
      const lArm = new THREE.Mesh(lArmGeo, goldAccentMat);
      lArm.rotation.z = Math.PI / 2; // make it horizontal
      lArm.position.set(0.15, 1.74, 0); // spans from X=0 to X=0.3
      lArm.castShadow = true;
      lampStandGroup.add(lArm);

      // Beautiful flared shade suspended straight vertically downward at the end of the arm
      const lShadeGeo = new THREE.CylinderGeometry(0.12, 0.24, 0.24, 24);
      const lShade = new THREE.Mesh(lShadeGeo, paperShadeMat);
      lShade.position.set(0.3, 1.58, 0); // sits exactly at X=0.3
      lShade.rotation.z = 0; // straight and stable hanging downward, absolutely no tilt!
      lShade.castShadow = true;
      lampStandGroup.add(lShade);

      // ONLY add the illuminated bulb & glowing light source if current lighting mode is turned on!
      if (customLampsOn) {
        // High golden PointLight glowing downward from lamp head
        const floorLampLight = new THREE.PointLight(tempColorHex, 4.5, 8);
        floorLampLight.position.set(0.3, 1.45, 0); // local to lampStandGroup coordinate space!
        floorLampLight.castShadow = true;
        floorLampLight.shadow.bias = -0.002;
        floorLampLight.shadow.normalBias = 0.05;
        floorLampLight.shadow.mapSize.width = 1024;
        floorLampLight.shadow.mapSize.height = 1024;
        lampStandGroup.add(floorLampLight);

        // Yellow Sphere glow indicator
        const glowGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.set(0.3, 1.47, 0); // local to lampStandGroup coordinate space!
        lampStandGroup.add(glowMesh);
      }

      // Default positioning
      const defaultLampX = roomW / 2 - 0.25;
      const defaultLampZ = roomD / 2 - 0.40;

      lampStandGroup.position.set(defaultLampX, 0, lampStandGroup.name === selectedFurniture ? furnitureZ : defaultLampZ);
      if (lampStandGroup.name === selectedFurniture) {
        lampStandGroup.position.x = furnitureX;
        lampStandGroup.rotation.y = furnitureRot;
        lampStandGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      } else {
        // Oriented 135-degrees inwards towards the interior space so it doesn't face the corner!
        lampStandGroup.rotation.y = -Math.PI * 0.75;
      }

      furnitureGroup.add(lampStandGroup);
    }

    // --- ACCENTS: Aroma Diffuser ---
    if (diffuserAdded) {
      const diffGroup = new THREE.Group();
      diffGroup.name = "diffuser";

      // Base ceramic vial
      const vGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
      const vMat = new THREE.MeshStandardMaterial({ color: 0xeae5d8, roughness: 0.1, metalness: 0.1 });
      const vial = new THREE.Mesh(vGeo, vMat);
      vial.position.y = 0.075;
      vial.castShadow = true;
      diffGroup.add(vial);

      // Vial collar
      const cGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12);
      const cMat = new THREE.MeshStandardMaterial({ color: 0xc49a45, metalness: 0.9, roughness: 0.1 });
      const collar = new THREE.Mesh(cGeo, cMat);
      collar.position.y = 0.16;
      diffGroup.add(collar);

      // Reed sticks / Diffuser sticks
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x4a3621, roughness: 0.9 });
      for (let i = 0; i < 4; i++) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.25), stickMat);
        stick.position.set(0.01 * (i - 1.5), 0.25, 0.01 * (i % 2 === 0 ? 1 : -1));
        stick.rotation.set((i - 1.5) * 0.12, 0, (i % 2 === 0 ? 0.15 : -0.15));
        diffGroup.add(stick);
      }

      // Default positioning on table/desk or bedside
      const defaultDiffX = -roomW / 2 + 1.15;
      const defaultDiffZ = roomD / 2 - 1.1; // desk proximity area
      const defaultHeight = (roomType === RoomType.BEDROOM) ? 0.55 : 0.74;

      diffGroup.position.set(defaultDiffX, defaultHeight, diffGroup.name === selectedFurniture ? furnitureZ : defaultDiffZ);
      if (diffGroup.name === selectedFurniture) {
        diffGroup.position.x = furnitureX;
        diffGroup.rotation.y = furnitureRot;
        diffGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        diffGroup.position.y = defaultHeight;
      }
      furnitureGroup.add(diffGroup);
    }

    // --- ACCENTS: Cushions ---
    if (cushionsAdded && roomType !== RoomType.LIVING_ROOM) {
      const cushGroup = new THREE.Group();
      cushGroup.name = "cushions";

      // 3 style-matched square throw pillows
      const cushionSpecs = getAccentCushionSpecs(style);
      cushionSpecs.forEach((spec, idx) => {
        const pillowMesh = createViewerThrowPillow(spec);
        const isLeftFront = idx === 1;
        const isRight = idx === 2;
        const xOffset = isRight ? 0.46 : isLeftFront ? -0.28 : -0.48;
        const yOffset = isLeftFront ? 0.19 : 0.23;
        const zOffset = roomType === RoomType.LIVING_ROOM
          ? (isLeftFront ? -0.15 : isRight ? -0.24 : -0.28)
          : (isLeftFront ? 0.11 : isRight ? 0.02 : -0.04);
        pillowMesh.position.set(xOffset, yOffset, zOffset);
        pillowMesh.rotation.set(
          isLeftFront ? -0.035 : roomType === RoomType.LIVING_ROOM ? -0.09 : 0.04,
          isRight ? -0.1 : isLeftFront ? 0.04 : 0.08,
          isRight ? 0.1 : isLeftFront ? 0.07 : -0.09
        );
        if (isLeftFront) pillowMesh.scale.set(0.92, 0.92, 0.92);
        cushGroup.add(pillowMesh);
      });

      // Default positioning near bed or couch
      const defaults = getFurnitureDefaults(roomType, "cushions");
      const defaultHeight = (roomType === RoomType.BEDROOM || roomType === RoomType.STUDIO) ? 0.55 : 0.5;

      cushGroup.position.set(defaults.x, defaultHeight, cushGroup.name === selectedFurniture ? furnitureZ : defaults.z);
      if (cushGroup.name === selectedFurniture) {
        cushGroup.position.x = furnitureX;
        cushGroup.rotation.y = furnitureRot;
        cushGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        cushGroup.position.y = defaultHeight;
      } else {
        cushGroup.rotation.y = defaults.rot;
      }
      furnitureGroup.add(cushGroup);
    }

    // --- TEXTILES: Throw blanket ---
    if (throwBlanketAdded && (roomType === RoomType.LIVING_ROOM || roomType === RoomType.BEDROOM || roomType === RoomType.STUDIO)) {
      const blanketGroup = createThrowBlanketMesh(style);
      blanketGroup.name = "throw_blanket";
      const defaults = getFurnitureDefaults(roomType, "throw_blanket");
      const defaultHeight = roomType === RoomType.LIVING_ROOM ? 0.58 : 0.62;

      blanketGroup.position.set(defaults.x, defaultHeight, blanketGroup.name === selectedFurniture ? furnitureZ : defaults.z);
      if (blanketGroup.name === selectedFurniture) {
        blanketGroup.position.x = furnitureX;
        blanketGroup.rotation.y = furnitureRot;
        blanketGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        blanketGroup.position.y = defaultHeight;
      } else {
        blanketGroup.rotation.y = defaults.rot;
      }
      furnitureGroup.add(blanketGroup);
    }

    // --- ACCENTS: Table Lamp ---
    if (tableLampAdded) {
      const tLampGroup = new THREE.Group();
      tLampGroup.name = "table_lamp";

      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
      const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf0ebe1, roughness: 0.8 });
      const pleatedMat = new THREE.MeshStandardMaterial({ color: 0xfffcf5, roughness: 0.95 });

      const footPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.022, 28), goldMat);
      footPlate.position.y = 0.011;
      footPlate.castShadow = true;
      footPlate.receiveShadow = true;
      tLampGroup.add(footPlate);

      // Rounded Ceramic bowl base
      const tBase = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), ceramicMat);
      tBase.scale.y = 0.8;
      tBase.position.y = 0.115;
      tBase.castShadow = true;
      tLampGroup.add(tBase);

      // Gold neck
      const tNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05), goldMat);
      tNeck.position.y = 0.195;
      tLampGroup.add(tNeck);

      // Flared pleated shade
      const tShade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 0.18, 24), pleatedMat);
      tShade.position.y = 0.285;
      tShade.castShadow = true;
      tLampGroup.add(tShade);

      if (customLampsOn) {
        // Table lamp warm point light
        const tLight = new THREE.PointLight(tempColorHex, 2.0, 4);
        tLight.position.set(0, 0.285, 0);
        tLight.castShadow = true;
        tLampGroup.add(tLight);

        // Bulb indicator
        const tBulb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffddaa }));
        tBulb.position.set(0, 0.235, 0);
        tLampGroup.add(tBulb);
      }

      // Default positioning on table/desk or bedside
      const defaultTLampX = -roomW / 2 + 1.15;
      const defaultTLampZ = roomD / 2 - 1.1; 
      const defaultHeight = (roomType === RoomType.BEDROOM) ? 0.55 : 0.74;

      tLampGroup.position.set(defaultTLampX, defaultHeight, tLampGroup.name === selectedFurniture ? furnitureZ : defaultTLampZ);
      if (tLampGroup.name === selectedFurniture) {
        tLampGroup.position.x = furnitureX;
        tLampGroup.rotation.y = furnitureRot;
        tLampGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        tLampGroup.position.y = defaultHeight;
      }

      furnitureGroup.add(tLampGroup);
    }

    // --- ACCENTS: Italian Cream Mushroom Lamp (🍄 義式奶油玻璃蘑菇檯燈) ---
    if (mushroomLampAdded) {
      const mushGroup = new THREE.Group();
      mushGroup.name = "mushroom_lamp";

      const shellMat = new THREE.MeshStandardMaterial({
        color: 0xfaf5eb, // warm cream white
        roughness: 0.15,
        metalness: 0.05,
        transparent: true,
        opacity: 0.95
      });

      // Stem (Pedestal base element)
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.075, 0.22, 24);
      const stem = new THREE.Mesh(stemGeo, shellMat);
      stem.position.y = 0.11;
      stem.castShadow = true;
      stem.receiveShadow = true;
      mushGroup.add(stem);

      // Flared mushroom cap dome (Hemisphere scaled vertically)
      const capGeo = new THREE.SphereGeometry(0.125, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, shellMat);
      cap.position.y = 0.19;
      cap.scale.y = 0.65;
      cap.castShadow = true;
      mushGroup.add(cap);

      // Bottom joint ring in glossy gold
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 24), goldMat);
      ring.position.y = 0.191;
      mushGroup.add(ring);

      if (customLampsOn) {
        // PointLight inside mushroom cap to emit warm amber glow
        const light = new THREE.PointLight(tempColorHex, 2.2, 3);
        light.position.set(0, 0.18, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        mushGroup.add(light);

        // Core glow bulb
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffeebb }));
        bulb.position.set(0, 0.18, 0);
        mushGroup.add(bulb);
      }

      const defaultMushX = 0.65;
      const defaultMushZ = 0.15;
      const defaultHeight = (roomType === RoomType.BEDROOM) ? 0.55 : 0.74; // Bedside or Desk

      mushGroup.position.set(defaultMushX, defaultHeight, mushGroup.name === selectedFurniture ? furnitureZ : defaultMushZ);
      if (mushGroup.name === selectedFurniture) {
        mushGroup.position.x = furnitureX;
        mushGroup.rotation.y = furnitureRot;
        mushGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        mushGroup.position.y = defaultHeight;
      }
      furnitureGroup.add(mushGroup);
    }

    // --- ACCENTS: Emerald Banker Table Lamp (📻 復古長型祖母綠玻璃書桌燈) ---
    if (vintageLampAdded) {
      const vinGroup = new THREE.Group();
      vinGroup.name = "vintage_lamp";

      const goldMat = new THREE.MeshStandardMaterial({ color: 0xc5a059, metalness: 0.85, roughness: 0.2 });
      const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x07421e, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });

      // Ornate heavy base step
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.08), goldMat);
      baseMesh.position.y = 0.01;
      baseMesh.castShadow = true;
      vinGroup.add(baseMesh);

      const baseStepMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.06), goldMat);
      baseStepMesh.position.y = 0.03;
      baseStepMesh.castShadow = true;
      vinGroup.add(baseStepMesh);

      // Curved slender support stem column (bent brass pipe style)
      const tJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 12), goldMat);
      tJoint.position.set(-0.01, 0.13, -0.01);
      tJoint.rotation.z = Math.PI / 18;
      tJoint.castShadow = true;
      vinGroup.add(tJoint);

      const topPivot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), goldMat);
      topPivot.position.set(-0.03, 0.24, -0.01);
      vinGroup.add(topPivot);

      const horizontalBar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 12), goldMat);
      horizontalBar.rotation.x = Math.PI / 2;
      horizontalBar.position.set(-0.03, 0.24, -0.01);
      vinGroup.add(horizontalBar);

      // Classic emerald glass swivel tube hood (Capsular shape)
      const hoodGroup = new THREE.Group();
      hoodGroup.position.set(-0.03, 0.24, -0.01);
      
      const glassCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16, 1, false, 0, Math.PI), emeraldMat);
      glassCylinder.rotation.x = Math.PI / 2;
      glassCylinder.castShadow = true;
      hoodGroup.add(glassCylinder);

      const glassPlates = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16, 1, false), emeraldMat);
      glassPlates.rotation.x = Math.PI / 2;
      glassPlates.scale.set(1, 1, 0.01);
      hoodGroup.add(glassPlates);

      vinGroup.add(hoodGroup);

      // Gold chain pull switch handle hanging down
      const switchChain = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.08), goldMat);
      switchChain.position.set(-0.03, 0.17, 0.04);
      vinGroup.add(switchChain);

      const chainTassel = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), goldMat);
      chainTassel.position.set(-0.03, 0.13, 0.04);
      vinGroup.add(chainTassel);

      if (customLampsOn) {
        // Point lights inside banker green glass shade
        const vLight = new THREE.PointLight(tempColorHex, 2.0, 3.5);
        vLight.position.set(-0.03, 0.21, -0.01);
        vLight.castShadow = true;
        vinGroup.add(vLight);
      }

      const defaultVinX = -0.65;
      const defaultVinZ = 0.15;
      const defaultHeight = (roomType === RoomType.BEDROOM) ? 0.55 : 0.74;

      vinGroup.position.set(defaultVinX, defaultHeight, vinGroup.name === selectedFurniture ? furnitureZ : defaultVinZ);
      if (vinGroup.name === selectedFurniture) {
        vinGroup.position.x = furnitureX;
        vinGroup.rotation.y = furnitureRot;
        vinGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        vinGroup.position.y = defaultHeight;
      }
      furnitureGroup.add(vinGroup);
    }

    // --- ACCENTS: Minimalist Cantilever Floor Lamp (💡 北歐極簡懸臂落地燈) ---
    if (cantileverLampAdded) {
      const cantGroup = new THREE.Group();
      cantGroup.name = "cantilever_lamp";

      const matteBlack = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.65, metalness: 0.2 });
      const goldenBronze = new THREE.MeshStandardMaterial({ color: 0xc5a059, metalness: 0.85, roughness: 0.25 });
      const paperShade = new THREE.MeshStandardMaterial({ color: 0xfffefa, roughness: 0.9 });

      // Clean round low profile metal baseline
      const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.018, 24), matteBlack);
      basePlate.position.y = 0.009;
      basePlate.castShadow = true;
      cantGroup.add(basePlate);

      // Tall slender primary vertical pole
      const mainPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 12), matteBlack);
      mainPole.position.set(-0.08, 0.7, 0);
      mainPole.castShadow = true;
      cantGroup.add(mainPole);

      // Designer gold adjuster knob joints
      const jointA = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), goldenBronze);
      jointA.position.set(-0.08, 1.35, 0);
      cantGroup.add(jointA);

      // Angled cantilever boom extension arm
      const extensionArm = new THREE.Group();
      extensionArm.position.set(-0.08, 1.35, 0);
      extensionArm.rotation.z = -Math.PI / 4; // tilt downwards

      const armBar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.75, 12), matteBlack);
      armBar.position.y = 0.355;
      armBar.castShadow = true;
      extensionArm.add(armBar);

      // Gold joint B at the end of the cantilever arm
      const jointB = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), goldenBronze);
      jointB.position.set(0, 0.71, 0);
      extensionArm.add(jointB);

      // Hanging conical lamp shade
      const shadeGroup = new THREE.Group();
      shadeGroup.position.set(0, 0.71, 0);
      shadeGroup.rotation.z = Math.PI / 4; // Cancel arm tilt so shade hangs straight!

      const pendantCone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 0.16, 24), paperShade);
      pendantCone.position.y = -0.08;
      pendantCone.castShadow = true;
      shadeGroup.add(pendantCone);

      if (customLampsOn) {
        // Soft PointLight radiating down from shade opening
        const cLight = new THREE.PointLight(tempColorHex, 3.8, 6.0);
        cLight.position.set(0, -0.15, 0);
        cLight.castShadow = true;
        shadeGroup.add(cLight);

        // Core bulb
        const cBulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff0dd }));
        cBulb.position.set(0, -0.09, 0);
        shadeGroup.add(cBulb);
      }

      extensionArm.add(shadeGroup);
      cantGroup.add(extensionArm);

      const defaultCantX = -roomW / 2 + 0.45;
      const defaultCantZ = roomD / 2 - 0.45;

      cantGroup.position.set(defaultCantX, 0, cantGroup.name === selectedFurniture ? furnitureZ : defaultCantZ);
      if (cantGroup.name === selectedFurniture) {
        cantGroup.position.x = furnitureX;
        cantGroup.rotation.y = furnitureRot;
        cantGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(cantGroup);
    }

    // --- ACCENTS: 1970 Chrome Eyeball Floor Lamp (💡 1970 太空球形落地燈) ---
    if (retroSphereLampAdded) {
      const retroGroup = new THREE.Group();
      retroGroup.name = "retro_sphere_lamp";

      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.08 });
      const internalMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc });

      // Shiny weighted round disk base
      const diskBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.024, 24), chromeMat);
      diskBase.position.y = 0.012;
      diskBase.castShadow = true;
      retroGroup.add(diskBase);

      // High polish central trunk pole
      const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 12), chromeMat);
      mainTrunk.position.y = 0.8;
      mainTrunk.castShadow = true;
      retroGroup.add(mainTrunk);

      // 3 spherical eyeball pods distributed at varying heights and angles around the trunk
      const heights = [1.0, 1.25, 1.5];
      const angles = [0, Math.PI * 0.75, -Math.PI * 0.75];
      const podDistance = 0.18;

      heights.forEach((h, idx) => {
        const podGroup = new THREE.Group();
        podGroup.position.y = h;
        podGroup.rotation.y = angles[idx];

        // Slim connector bracket
        const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, podDistance, 8), chromeMat);
        bracket.rotation.z = Math.PI / 2;
        bracket.position.x = podDistance / 2;
        podGroup.add(bracket);

        // Eyeball socket sphere (sphere cut in half to show interior illuminated bulb)
        const eyeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), chromeMat);
        eyeSphere.position.x = podDistance;
        eyeSphere.castShadow = true;
        podGroup.add(eyeSphere);

        // Lit bulb glow
        if (customLampsOn) {
          const bulbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), internalMat);
          bulbGlow.position.set(podDistance + 0.02, 0, 0);
          podGroup.add(bulbGlow);

          const rLight = new THREE.PointLight(tempColorHex, 2.0, 4.0);
          rLight.position.set(podDistance + 0.04, 0, 0);
          rLight.castShadow = true;
          rLight.shadow.bias = -0.001;
          podGroup.add(rLight);
        }

        retroGroup.add(podGroup);
      });

      const defaultRetroX = roomW / 2 - 0.45;
      const defaultRetroZ = -roomD / 2 + 0.45;

      retroGroup.position.set(defaultRetroX, 0, retroGroup.name === selectedFurniture ? furnitureZ : defaultRetroZ);
      if (retroGroup.name === selectedFurniture) {
        retroGroup.position.x = furnitureX;
        retroGroup.rotation.y = furnitureRot;
        retroGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
      }
      furnitureGroup.add(retroGroup);
    }

    // --- ACCENTS: Craftsman Suitcase Record Turntable (🎵 職人手提黑膠唱片機) ---
    if (turntableAdded) {
      const turntableGroup = new THREE.Group();
      turntableGroup.name = "turntable";

      const woodCase = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.6 }); // deep walnut
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 });
      const vinylMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }); // vinyl record grooved texture representation

      // Suitcase main physical enclosure console
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.32), woodCase);
      body.position.y = 0.04;
      body.castShadow = true;
      body.receiveShadow = true;
      turntableGroup.add(body);

      // Angled suitcase lid (open cover)
      const openLid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.32), woodCase);
      openLid.position.set(0, 0.16, -0.14);
      openLid.rotation.x = -Math.PI / 4; // tilted up and back
      openLid.castShadow = true;
      turntableGroup.add(openLid);

      // Brass corner hinges
      const corners = [
        [-0.182, 0.04, -0.161], [0.182, 0.04, -0.161],
        [-0.182, 0.04, 0.161], [0.182, 0.04, 0.161]
      ];
      corners.forEach(([cx, cy, cz]) => {
        const hg = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.021, 0.015), goldMat);
        hg.position.set(cx, cy, cz);
        turntableGroup.add(hg);
      });

      // Rotating vinyl platter disc
      const vinylDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 36), vinylMat);
      vinylDisk.position.set(-0.03, 0.084, 0);
      vinylDisk.castShadow = true;
      turntableGroup.add(vinylDisk);

      // Vinyl label center 
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.009, 18), goldMat);
      label.position.set(-0.03, 0.084, 0);
      turntableGroup.add(label);

      // Brass tone arm with cartridge needle
      const toneArmGroup = new THREE.Group();
      toneArmGroup.position.set(0.1, 0.08, -0.09);
      
      const armPole = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12), goldMat);
      armPole.rotation.x = Math.PI / 2;
      armPole.rotation.z = Math.PI / 6; // swung dynamic angle towards vinyl center
      armPole.position.set(-0.02, 0.012, 0.04);
      toneArmGroup.add(armPole);

      const pivotHead = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.016, 12), goldMat);
      pivotHead.position.set(0, 0.008, 0);
      toneArmGroup.add(pivotHead);

      turntableGroup.add(toneArmGroup);

      // Tiny physical control tuner dials
      const knobA = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 10), goldMat);
      knobA.position.set(0.12, 0.083, 0.08);
      turntableGroup.add(knobA);

      const knobB = knobA.clone();
      knobB.position.set(0.12, 0.083, 0.12);
      turntableGroup.add(knobB);

      const defaultTurnX = 0.35;
      const defaultTurnZ = -0.15;
      const defaultHeight = (roomType === RoomType.BEDROOM) ? 0.55 : 0.74;

      turntableGroup.position.set(defaultTurnX, defaultHeight, turntableGroup.name === selectedFurniture ? furnitureZ : defaultTurnZ);
      if (turntableGroup.name === selectedFurniture) {
        turntableGroup.position.x = furnitureX;
        turntableGroup.rotation.y = furnitureRot;
        turntableGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        turntableGroup.position.y = defaultHeight;
      }
      furnitureGroup.add(turntableGroup);
    }

    // --- ACCENTS: Wabi-Sabi Geometric Clay Sculpture (🧱 侘寂工藝石膏幾何雕塑) ---
    if (sculptureAdded) {
      const sculptureGroup = new THREE.Group();
      sculptureGroup.name = "sculpture";

      const roughPorousClay = new THREE.MeshStandardMaterial({
        color: 0xdfdad2, // warm stone travertine beige
        roughness: 0.95,
        metalness: 0.02
      });

      const bronzeSubAccent = new THREE.MeshStandardMaterial({
        color: 0x705d47,
        metalness: 0.75,
        roughness: 0.45
      });

      // Rough rectangular platform pedestal block
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.16), roughPorousClay);
      pedestal.position.y = 0.03;
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      sculptureGroup.add(pedestal);

      // Large interlocking clay torus/ring element standing vertically
      const ringSculpt = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.022, 12, 24), roughPorousClay);
      ringSculpt.position.set(0, 0.17, 0);
      ringSculpt.rotation.y = Math.PI / 4;
      ringSculpt.castShadow = true;
      sculptureGroup.add(ringSculpt);

      // Tiny bronze sphere perfectly balanced inside or beside the ring
      const ballA = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), bronzeSubAccent);
      ballA.position.set(-0.06, 0.09, 0.04);
      ballA.castShadow = true;
      sculptureGroup.add(ballA);

      // Suspended hollow geometric block balance act
      const balancingCube = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), roughPorousClay);
      balancingCube.position.set(0.04, 0.28, -0.04);
      balancingCube.rotation.set(Math.PI / 6, Math.PI / 5, Math.PI / 3);
      balancingCube.castShadow = true;
      sculptureGroup.add(balancingCube);

      const defaultSculptX = -0.25;
      const defaultSculptZ = 0.25;
      const defaultHeight = (roomType === RoomType.BEDROOM) ? 0.55 : 0.74;

      sculptureGroup.position.set(defaultSculptX, defaultHeight, sculptureGroup.name === selectedFurniture ? furnitureZ : defaultSculptZ);
      if (sculptureGroup.name === selectedFurniture) {
        sculptureGroup.position.x = furnitureX;
        sculptureGroup.rotation.y = furnitureRot;
        sculptureGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        sculptureGroup.position.y = defaultHeight;
      }
      furnitureGroup.add(sculptureGroup);
    }

    // --- ACCENTS: Stacked Coffee Table Art Books and Candle (📚 巴黎藝術史疊書與香氛) ---
    if (stackedBooksAdded) {
      const booksGroup = new THREE.Group();
      booksGroup.name = "stacked_books";

      const bookColors = [
        0x1c2b22, // Forest Green
        0xdad1c1, // Linen Beige
        0x202021  // Onyx Charcoal
      ];

      const pageMat = new THREE.MeshStandardMaterial({ color: 0xfffcf5, roughness: 0.9 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });

      // Build 3 books stacked at slight organic rotation offsets!
      const rotations = [0.08, -0.05, 0.12];
      const positionsY = [0.015, 0.041, 0.063];
      const dimensions = [
        [0.26, 0.026, 0.21], // Bottom big book
        [0.24, 0.023, 0.19], // Middle book
        [0.22, 0.019, 0.17]  // Top book
      ];

      for (let i = 0; i < 3; i++) {
        const [w, h, d] = dimensions[i];
        const bCol = bookColors[i];

        const singleBook = new THREE.Group();
        singleBook.position.y = positionsY[i];
        singleBook.rotation.y = rotations[i];

        // Cover mesh
        const coverMat = new THREE.MeshStandardMaterial({ color: bCol, roughness: 0.85 });
        const coverMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), coverMat);
        coverMesh.castShadow = true;
        coverMesh.receiveShadow = true;
        singleBook.add(coverMesh);

        // Core white/yellow pages mesh inside cover
        const pagesMesh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.01, h - 0.005, d - 0.01), pageMat);
        pagesMesh.position.set(0.004, 0, 0.004);
        singleBook.add(pagesMesh);

        // Delicate gold foil spine typography lines
        const spineTypography = new THREE.Mesh(new THREE.BoxGeometry(0.014, h - 0.002, 0.05), goldMat);
        spineTypography.position.set(-w / 2, 0, 0.02);
        singleBook.add(spineTypography);

        booksGroup.add(singleBook);
      }

      // Propped luxury frosted glass scented candle on top of books
      const candleGroup = new THREE.Group();
      candleGroup.position.set(0.02, 0.0725 + 0.045, 0.01);

      const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.65, roughness: 0.2 });
      const waxMat = new THREE.MeshStandardMaterial({ color: 0xfcfbf2, roughness: 0.9 });

      const glassVessel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16), glassMat);
      glassVessel.castShadow = true;
      candleGroup.add(glassVessel);

      const waxCore = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.05, 12), waxMat);
      waxCore.position.y = -0.004;
      candleGroup.add(waxCore);

      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.012), new THREE.MeshBasicMaterial({ color: 0x333333 }));
      wick.position.y = 0.026;
      candleGroup.add(wick);

      // Tiny flame indicator
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa44 }));
      flame.scale.y = 1.8;
      flame.position.y = 0.034;
      candleGroup.add(flame);

      booksGroup.add(candleGroup);

      const defaultBooksX = 0.15;
      const defaultBooksZ = 0.35;
      const defaultHeight = (roomType === RoomType.BEDROOM) ? 0.55 : 0.74;

      booksGroup.position.set(defaultBooksX, defaultHeight, booksGroup.name === selectedFurniture ? furnitureZ : defaultBooksZ);
      if (booksGroup.name === selectedFurniture) {
        booksGroup.position.x = furnitureX;
        booksGroup.rotation.y = furnitureRot;
        booksGroup.scale.set(furnitureScale, furnitureScale, furnitureScale);
        booksGroup.position.y = defaultHeight;
      }
      furnitureGroup.add(booksGroup);
    }

    // Apply visibility overrides for core/initial furniture pieces based on user preset choices
    furnitureGroup.traverse((child) => {
      if (child instanceof THREE.Group || child instanceof THREE.Mesh) {
        if (roomType === RoomType.LIVING_ROOM) {
          if (child.name === 'sofa_or_bed') child.visible = livingSofaAdded;
          if (child.name === 'coffee_table') child.visible = livingCoffeeTableAdded;
          if (child.name === 'tv_console') child.visible = livingTvConsoleAdded;
        } else if (roomType === RoomType.BEDROOM) {
          if (child.name === 'sofa_or_bed') child.visible = bedroomBedAdded;
          if (child.name === 'stands') child.visible = bedroomStandsAdded;
          if (child.name === 'wardrobe') child.visible = wardrobeAdded;
        } else if (roomType === RoomType.DINING_ROOM) {
          if (child.name === 'sofa_or_bed') child.visible = diningSetAdded;
          if (child.name === 'sideboard') child.visible = diningSideboardAdded;
        } else if (roomType === RoomType.OFFICE) {
          if (child.name === 'sofa_or_bed') child.visible = officeDeskAdded;
          if (child.name === 'bookcase') child.visible = officeBookcaseAdded;
        } else if (roomType === RoomType.BATHROOM) {
          // Note we have bathtub(sofa_or_bed), vanity, toilet
          if (child.name === 'sofa_or_bed') child.visible = bathroomBathtubAdded;
          if (child.name === 'vanity') child.visible = bathroomVanityAdded;
          if (child.name === 'toilet') child.visible = bathroomToiletAdded;
        } else if (roomType === RoomType.KITCHEN) {
          if (child.name === 'sofa_or_bed') child.visible = kitchenCounterAdded;
          if (child.name === 'fridge') child.visible = kitchenFridgeAdded;
        } else if (roomType === RoomType.STUDIO) {
          if (child.name === 'sofa_or_bed') child.visible = studioBedAdded;
          if (child.name === 'studio_sofa') child.visible = studioDeskAdded;
          if (child.name === 'coffee_table') child.visible = studioWardrobeAdded;
        }
      }
    });

    scene.add(furnitureGroup);

    // 5. LIGHTING GROUP setup
    const lightingGroup = new THREE.Group();
    scene.add(lightingGroup);

    // Only illuminate/glow in dusk/night modes or if manual soft lighting is turned on
    const lampsAreLit = timeOfDay === 'sunset' || timeOfDay === 'night' || customLampsOn;

    // Dynamic environmental light variables based on timeOfDay
    let mainColor = 0xffffff;
    let mainIntensity = 2.0;
    let mainAngle = [6, 10, 4];
    let ambientIntensity = 0.85;
    let ambientColor = 0xebefff;

    if (timeOfDay === 'sunset') {
      mainColor = 0xff5511; // Deep golden sunset glow
      mainIntensity = 3.2;
      mainAngle = [8, 3, 5];
      ambientIntensity = lampsAreLit ? 0.75 : 0.5; // boost ambient bounce when lamps are lit
      ambientColor = lampsAreLit ? 0xffdfc2 : 0xffae70;
    } else if (timeOfDay === 'night') {
      mainColor = 0x8899ff; // cool moonlight
      mainIntensity = 0.4;
      mainAngle = [4, 8, -4];
      ambientIntensity = lampsAreLit ? 0.75 : 0.15; // massive lift to 0.75 when light is switched on!
      ambientColor = lampsAreLit ? 0x564c42 : 0x1d2238; // cozy amber glow reflections instead of cool dark grey
    }

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
    lightingGroup.add(ambientLight);

    // Sun / Main directional light
    const sunLight = new THREE.DirectionalLight(mainColor, mainIntensity);
    sunLight.position.set(mainAngle[0], mainAngle[1], mainAngle[2]);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;

    // Tight shadow camera frustum matching the room size dynamically to maximize shadow resolution and erase pixelated shadow mosaic flickering
    const maxDim = Math.max(roomWidth / 100, roomLength / 100, roomHeight / 100);
    sunLight.shadow.camera.left = -maxDim;
    sunLight.shadow.camera.right = maxDim;
    sunLight.shadow.camera.top = maxDim * 1.5;
    sunLight.shadow.camera.bottom = -maxDim;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = maxDim * 5;
    sunLight.shadow.normalBias = 0.04; // Eliminates shadow acne patterns (flickering grids) on geometry surfaces

    lightingGroup.add(sunLight);

    // --- PHYSICAL 3D CEILING FIXTURES & SHADOWED DOWNLIGHTING DESIGN ---
    const fixtureGroup = new THREE.Group();
    fixtureGroup.name = "ceiling_fixture";

    // Premium realistic materials for ceiling fittings
    const fMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f1f21, metalness: 0.9, roughness: 0.25 }); // Brushed gunmetal black
    const fBrassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.15 }); // Warm golden brass
    const fGlowMat = new THREE.MeshBasicMaterial({ color: 0xfffcf0 }); // High luminosity light-emitting lens
    const fWireMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2d, roughness: 0.7 }); // Suspension cables
    const fWoodMat = new THREE.MeshStandardMaterial({ color: 0xb08861, roughness: 0.6 }); // Scandinavian warm blonde oak

    const bulbMat = lampsAreLit ? fGlowMat : new THREE.MeshStandardMaterial({ color: 0xdddddf, roughness: 0.2 });

    if (effectiveCeilingLightStyle === 'flushmount') {
      // 0. Classic Elegant Flush Mount Ceiling Lamp Dome (預設現代吸頂燈)
      const flGroup = new THREE.Group();
      flGroup.position.set(0, roomH, 0);

      // Low bezel metal ring base
      const bezelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.02, 24);
      const bezel = new THREE.Mesh(bezelGeo, fMetalMat);
      bezel.castShadow = true;
      flGroup.add(bezel);

      // Accent rim wrap (Brass for ultra premium look, Wood if Scandinavian style is active)
      const trimMat = style === DesignStyle.SCANDINAVIAN || style === DesignStyle.MINIMALIST ? fWoodMat : fBrassMat;
      const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.035, 24), trimMat);
      trim.position.y = -0.015;
      trim.castShadow = true;
      flGroup.add(trim);

      // Pristine opal glass warm white illuminated circular bowl dome
      const glassDome = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.045, 24), bulbMat);
      glassDome.position.y = -0.04;
      flGroup.add(glassDome);

      if (lampsAreLit) {
        // High intensity broad downlight filling the space nicely
        const pl = new THREE.PointLight(tempColorHex, 5.0, 15);
        pl.position.set(0, -0.15, 0);
        pl.castShadow = true;
        pl.shadow.bias = -0.002;
        pl.shadow.normalBias = 0.05;
        pl.shadow.mapSize.width = 1024;
        pl.shadow.mapSize.height = 1024;
        flGroup.add(pl);
      }
      fixtureGroup.add(flGroup);
    } else if (effectiveCeilingLightStyle === 'modern') {
      // 1. Modern Flat/Recessed Spotlights (嵌入式投射筒燈 x4 inside the ceiling corners)
      const offsets = [
        { x: -roomW * 0.25, z: -roomD * 0.25 },
        { x: roomW * 0.25, z: -roomD * 0.25 },
        { x: -roomW * 0.25, z: roomD * 0.25 },
        { x: roomW * 0.25, z: roomD * 0.25 }
      ];

      offsets.forEach((offset, idx) => {
        const spotSub = new THREE.Group();
        spotSub.position.set(offset.x, roomH - 0.015, offset.z);

        // Circular metallic bezel rim
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16), fMetalMat);
        rim.castShadow = true;
        spotSub.add(rim);

        // Sunken light emissive lens/bulb
        const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.01, 16), bulbMat);
        bulb.position.y = -0.012;
        spotSub.add(bulb);

        if (lampsAreLit) {
          const pl = new THREE.PointLight(tempColorHex, 1.25, 6);
          pl.position.set(0, -0.1, 0);
          pl.castShadow = true;
          pl.shadow.bias = -0.003;
          pl.shadow.normalBias = 0.03;
          pl.shadow.mapSize.width = 512;
          pl.shadow.mapSize.height = 512;
          spotSub.add(pl);
        }

        fixtureGroup.add(spotSub);
      });
    } else if (effectiveCeilingLightStyle === 'scandinavian') {
      // 2. Scandinavian Conical Wooden/Fibre Pendant (北歐風漏斗溫潤單頭吊燈)
      const scandiGroup = new THREE.Group();
      scandiGroup.position.set(0, roomH, 0);

      // Thinner suspension cord / cable
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.75, 8), fWireMat);
      cord.position.y = -0.375;
      cord.castShadow = true;
      scandiGroup.add(cord);

      // Wooden collar block at top of shade
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), fWoodMat);
      collar.position.y = -0.71;
      collar.castShadow = true;
      scandiGroup.add(collar);

      // Flared pristine funnel dome cone shade
      const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.8 });
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.19, 0.22, 24), shadeMat);
      funnel.position.y = -0.84;
      funnel.castShadow = true;
      scandiGroup.add(funnel);

      // Low glowing round bulb inside
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 12), bulbMat);
      bulb.position.y = -0.93;
      scandiGroup.add(bulb);

      if (lampsAreLit) {
        const pl = new THREE.PointLight(tempColorHex, 3.6, 11);
        pl.position.set(0, -0.96, 0);
        pl.castShadow = true;
        pl.shadow.bias = -0.003;
        pl.shadow.normalBias = 0.03;
        scandiGroup.add(pl);
      }

      fixtureGroup.add(scandiGroup);
    } else if (effectiveCeilingLightStyle === 'industrial') {
      // 3. Industrial Multi-Spotlight Track Light (工業酷炭深色三頭軌道燈)
      const trackGroup = new THREE.Group();
      trackGroup.position.set(0, roomH, 0);

      // Black metal rail track extending along the X axis
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.024, 0.024), fMetalMat);
      rail.position.y = -0.012;
      rail.castShadow = true;
      trackGroup.add(rail);

      // Spaced spotlight modules
      const spotXPositions = [-0.55, 0, 0.55];
      spotXPositions.forEach((xPos, idx) => {
        const spotSub = new THREE.Group();
        spotSub.position.set(xPos, -0.024, 0);

        const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8), fMetalMat);
        joint.position.y = -0.02;
        spotSub.add(joint);

        const canMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.85, roughness: 0.3 });
        const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.13, 16), canMat);
        canister.position.set(0, -0.08, 0.02);
        
        // Tilt the industrial spotlights slightly outwards
        canister.rotation.x = 0.35;
        if (idx === 0) canister.rotation.z = -0.25;
        if (idx === 2) canister.rotation.z = 0.25;
        canister.castShadow = true;
        spotSub.add(canister);

        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.005, 12), bulbMat);
        lens.position.set(0, -0.14, 0.04);
        lens.rotation.x = 0.35;
        if (idx === 0) lens.rotation.z = -0.25;
        if (idx === 2) lens.rotation.z = 0.25;
        spotSub.add(lens);

        fixtureGroup.add(spotSub);
      });

      if (lampsAreLit) {
        const pl = new THREE.PointLight(tempColorHex, 3.2, 10);
        pl.position.set(0, -0.4, 0);
        pl.castShadow = true;
        pl.shadow.bias = -0.003;
        pl.shadow.normalBias = 0.04;
        trackGroup.add(pl);
      }

      fixtureGroup.add(trackGroup);
    } else if (effectiveCeilingLightStyle === 'luxury') {
      // 4. Double Nesting Halo Chandelier (極奢星環雙層吊燈)
      const luxuryGroup = new THREE.Group();
      luxuryGroup.position.set(0, roomH, 0);

      const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.025, 16), fBrassMat);
      rosette.position.y = -0.01;
      rosette.castShadow = true;
      luxuryGroup.add(rosette);

      const numWires = 3;
      for (let i = 0; i < numWires; i++) {
        const wireAngle = (i / numWires) * Math.PI * 2;
        const rad = 0.22;
        const wx = Math.cos(wireAngle) * rad;
        const wz = Math.sin(wireAngle) * rad;

        const wireGroup = new THREE.Group();
        const wireCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.46, 6), fWireMat);
        wireCyl.position.set(wx / 2, -0.23, wz / 2);
        wireCyl.rotation.z = -Math.atan2(wx, 0.46) / 2;
        wireCyl.rotation.x = Math.atan2(wz, 0.46) / 2;
        wireGroup.add(wireCyl);
        luxuryGroup.add(wireGroup);
      }

      const ringOuterMat = fBrassMat;
      const torusOuter = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.018, 12, 48), ringOuterMat);
      torusOuter.rotation.x = Math.PI / 2;
      torusOuter.position.y = -0.42;
      torusOuter.castShadow = true;
      luxuryGroup.add(torusOuter);

      const neonOuter = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.008, 8, 48), bulbMat);
      neonOuter.rotation.x = Math.PI / 2;
      neonOuter.position.y = -0.42;
      luxuryGroup.add(neonOuter);

      const torusInner = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.014, 12, 36), ringOuterMat);
      torusInner.rotation.x = Math.PI / 2 + 0.08;
      torusInner.rotation.y = 0.05;
      torusInner.position.set(0.02, -0.54, 0.0);
      torusInner.castShadow = true;
      luxuryGroup.add(torusInner);

      const neonInner = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.006, 8, 36), bulbMat);
      neonInner.rotation.x = Math.PI / 2 + 0.08;
      neonInner.rotation.y = 0.05;
      neonInner.position.set(0.02, -0.54, 0.0);
      luxuryGroup.add(neonInner);

      if (lampsAreLit) {
        const pl = new THREE.PointLight(tempColorHex, 3.8, 13);
        pl.position.set(0, -0.48, 0);
        pl.castShadow = true;
        pl.shadow.bias = -0.0025;
        pl.shadow.normalBias = 0.04;
        pl.shadow.mapSize.width = 1024;
        pl.shadow.mapSize.height = 1024;
        luxuryGroup.add(pl);
      }

      fixtureGroup.add(luxuryGroup);
    }

    lightingGroup.add(fixtureGroup);

    // Restore original scene.add
    scene.add = originalSceneAdd;

    // Atomic Swap: swap out the old roomContainer for the new one synchronously to prevent flickering!
    const existingContainer = scene.getObjectByName("room_container");
    if (existingContainer) {
      scene.remove(existingContainer);
      existingContainer.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    // Add the new atomic room container to the scene
    scene.add(roomContainer);

    // Camera initial framing adjust
    if (camera) camera.lookAt(0, 0.5, 0);

    // 6. ANIMATION LOOP
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Minimal floating item rotates slightly for extra visual depth if selected
      if (controls) {
        controls.update();
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    // CLEANUP — runs before each scene rebuild and on unmount.
    // Dispose all geometry/materials in the scene to prevent GPU memory accumulation
    // across style/furniture changes. Renderer is intentionally kept alive and reused.
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (scene) {
        scene.add = originalSceneAdd;
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(m => m.dispose());
          }
        });
      }
    };
  }, [
    style, roomType, floorStyle, wallColor, timeOfDay, customLampsOn, plantAdded, artworkAdded, concreteWallAdded,
    roomWidth, roomLength, roomHeight,
    doorStyle, doorPosition, doorOffset, doorColor,
    windowStyle, windowPosition, windowOffset, windowHeight, windowWidth,
    floorRoughness, floorTiling, wallMaterialType, wallCustomColor, wallUseCustomColor,
    wallAccentEnabled, wallAccentColor, couchMaterial, sofaType, bedType,
    floorLampAdded, wineCabinetAdded, catTowerAdded, barCartAdded, ceilingLightStyle,
    leatherPresetActive, herringbonePresetActive, ceilingLightPresetStyle,
    diffuserAdded, cushionsAdded, areaRugAdded, throwBlanketAdded, curtainsAdded, wallMirrorAdded,
    tableLampAdded, wardrobeAdded, lightTemperature,
    vaseAdded, clockAdded, shoeCabinetAdded, mushroomLampAdded, vintageLampAdded,
    cantileverLampAdded, retroSphereLampAdded, turntableAdded, sculptureAdded, stackedBooksAdded,
    botanicalPrintAdded, abstractOilAdded, japanInkAdded,
    livingSofaAdded, livingCoffeeTableAdded, livingTvConsoleAdded,
    bedroomBedAdded, bedroomStandsAdded,
    diningSetAdded, diningSideboardAdded,
    officeDeskAdded, officeBookcaseAdded,
    bathroomBathtubAdded, bathroomVanityAdded, bathroomToiletAdded, bathroomShowerAdded,
    kitchenCounterAdded, kitchenFridgeAdded,
    studioBedAdded, studioDeskAdded, studioWardrobeAdded
  ]);

  // Dynamic update of furniture position/rotation/scale directly in ThreeJS scene (Buttery smooth with zero lag and flickering!)
  useEffect(() => {
    const furnitureGroup = furnitureGroupRef.current;
    if (!furnitureGroup) return;

    const interactiveNames = [
      'sofa_or_bed', 'coffee_table', 'tv_console', 'stands', 'sideboard', 
      'bookcase', 'vanity', 'toilet', 'fridge', 'studio_sofa', 
      'accent_plant', 'accent_artwork', 'wine_cabinet', 'cat_tower', 'bar_cart',
      'accent_lamp', 'diffuser', 'cushions', 'table_lamp', 'wardrobe',
      'vase', 'clock', 'shoe_cabinet', 'mushroom_lamp', 'vintage_lamp',
      'cantilever_lamp', 'retro_sphere_lamp', 'turntable', 'sculpture', 'stacked_books',
      'throw_blanket', 'wall_mirror'
    ];

    furnitureGroup.traverse((child) => {
      if (child instanceof THREE.Group && child.name && interactiveNames.includes(child.name)) {
        if (child.userData.initialY === undefined) {
          child.userData.initialY = child.position.y;
        }
        const isSelected = child.name === selectedFurniture;
        const defaults = getFurnitureDefaults(roomType, child.name);
        
        const targetX = isSelected ? furnitureX : defaults.x;
        const targetY = isSelected ? (child.userData.initialY + furnitureY) : child.userData.initialY;
        const targetZ = isSelected ? furnitureZ : defaults.z;
        const targetRot = isSelected ? furnitureRot : defaults.rot;
        const targetScale = isSelected ? furnitureScale : defaults.scale;

        child.position.set(targetX, targetY, targetZ);
        child.rotation.y = targetRot;
        child.scale.set(targetScale, targetScale, targetScale);
      }
    });
  }, [selectedFurniture, furnitureX, furnitureY, furnitureZ, furnitureRot, furnitureScale, roomType]);

  // Adjust camera point of view directly
  const adjustCameraView = (view: 'orbit' | 'top' | 'front') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (view === 'top') {
      camera.position.set(0.01, 10, 0); // Directly overhead looking down
      controls.target.set(0, 0, 0);
    } else if (view === 'front') {
      camera.position.set(0, 1.5, 8); // Wall view facing head-on
      controls.target.set(0, 1, 0);
    } else {
      // Prevent room being cut off on narrow viewports/expanded sidebars
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 600;
      const aspect = width / height;
      const factor = aspect < 1.4 ? Math.min(1.45, 1.25 * (1.4 / aspect)) : 1.0;

      camera.position.set(6 * factor, 4.5 * factor, 6 * factor); // aspect-ratio aware standard beauty angle
      controls.target.set(0, 0.5, 0);
    }
    controls.update();
  };

  // Trigger camera adjustment on sidebar toggling to adapt aspect ratio instantly!
  useEffect(() => {
    const timer = setTimeout(() => {
      adjustCameraView('orbit');
    }, 180); // slight delay to allow layout animations/transitions to settle
    return () => clearTimeout(timer);
  }, [isSidebarCollapsed]);

  // Reset furniture offsets
  const resetFurniturePlacement = () => {
    syncSlidersToDefault(roomType, selectedFurniture);
  };

  // Reset all layout variables to their premium defaults
  const resetWholeLayout = () => {
    setRoomWidth(500);
    setRoomLength(400);
    setRoomHeight(260);
    setDoorStyle('modern');
    setDoorPosition('right');
    setDoorOffset(0.8);
    setDoorColor('#e5e5e5');
    setWindowStyle('modern_single');
    setWindowPosition('left');
    setWindowOffset(-0.4);
    setWindowHeight(1.4);
    setWindowWidth(1.1);
    // Lighting is part of the layout tab — reset together
    setTimeOfDay('day');
    setCustomLampsOn(false);
    setLightTemperature('warmwhite');
  };

  // Reset all material surface values to initial design defaults
  const resetWholeMaterials = () => {
    setFloorStyle('oak');
    setFloorRoughness(0.6);
    setFloorTiling(1.0);
    setWallMaterialType('paint');
    setWallColor('offwhite');
    setWallCustomColor('#faf9f6');
    setWallUseCustomColor(false);
    setWallAccentEnabled(false);
    setWallAccentColor('#8f9779');
    setCouchMaterial('fabric');
    // Clear furniture-tab preset overrides that affect material rendering
    setLeatherPresetActive(false);
    setHerringbonePresetActive(false);
    setConcreteWallAdded(false);
  };

  // Reset all furniture and decoration back to initial state
  const resetDecorAdditions = () => {
    // --- Core hard furnishings (硬裝) — restore to initial true/false ---
    setLivingSofaAdded(true);
    setLivingCoffeeTableAdded(true);
    setLivingTvConsoleAdded(true);
    setBedroomBedAdded(true);
    setBedroomStandsAdded(true);
    setDiningSetAdded(true);
    setDiningSideboardAdded(true);
    setOfficeDeskAdded(true);
    setOfficeBookcaseAdded(true);
    setBathroomBathtubAdded(true);
    setBathroomVanityAdded(true);
    setBathroomToiletAdded(true);
    setBathroomShowerAdded(true);
    setKitchenCounterAdded(true);
    setKitchenFridgeAdded(true);
    setStudioBedAdded(false);
    setStudioDeskAdded(true);
    setStudioWardrobeAdded(true);
    // --- Soft furnishings & accents (軟裝) — restore to room defaults ---
    setPlantAdded(false);
    setFloorLampAdded(false);
    setArtworkAdded(false);
    setBotanicalPrintAdded(false);
    setAbstractOilAdded(false);
    setJapanInkAdded(false);
    setWineCabinetAdded(false);
    setCatTowerAdded(false);
    setBarCartAdded(false);
    setConcreteWallAdded(false);
    setDiffuserAdded(false);
    setCushionsAdded(roomType === RoomType.LIVING_ROOM);
    setAreaRugAdded(true);
    setThrowBlanketAdded(false);
    setCurtainsAdded(false);
    setWallMirrorAdded(false);
    setTableLampAdded(false);
    setMushroomLampAdded(false);
    setVintageLampAdded(false);
    setCantileverLampAdded(false);
    setRetroSphereLampAdded(false);
    setTurntableAdded(false);
    setSculptureAdded(false);
    setStackedBooksAdded(false);
    setWardrobeAdded(false);
    setVaseAdded(false);
    setClockAdded(false);
    setShoeCabinetAdded(false);
    setCeilingLightStyle('flushmount');
    setLeatherPresetActive(false);
    setHerringbonePresetActive(false);
    setCeilingLightPresetStyle(null);
  };

  // Capture canvas viewport as high quality png
  const handleExport3DImage = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `3d-space-preview-${roomType.replace(' ', '_')}-${style}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const currentRoomLabel = ({
    [RoomType.LIVING_ROOM]: '客廳',
    [RoomType.BEDROOM]: '臥室',
    [RoomType.DINING_ROOM]: '餐廳',
    [RoomType.OFFICE]: '書房',
    [RoomType.BATHROOM]: '衛浴',
    [RoomType.KITCHEN]: '廚房',
    [RoomType.STUDIO]: '套房'
  } as Record<RoomType, string>)[roomType];
  const currentStyleLabel = DESIGN_STYLE_LABELS[style].replace(/\s*\([^)]*\)/g, '');

  return (
    <div className="w-full h-full flex flex-col bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800/85 text-neutral-200">
      
      {/* Configuration checker header & quick switcher row */}
      <div className={`bg-neutral-950 px-4 py-2 border-b border-neutral-800/90 flex flex-col ${isSidebarCollapsed ? 'lg:flex-row lg:items-center' : 'xl:flex-row xl:items-center'} justify-between gap-2 shrink-0`}>
        <div className="flex items-center gap-1.5 select-none py-1">
          <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] font-semibold text-neutral-200 leading-none">
            {currentRoomLabel}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] font-semibold text-neutral-200 leading-none">
            風格：{currentStyleLabel}
          </span>
        </div>

        {/* Floating Room Type Quick Switcher (Now header row toolbar - non-overlaying, scrollable, compact!) */}
        <div className={`flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 shadow-lg select-none w-full ${isSidebarCollapsed ? 'lg:w-auto' : 'xl:w-auto'} overflow-hidden`}>
          <div className="flex items-center gap-1.5 mr-1 px-1.5 py-0.5 border-r border-neutral-800 shrink-0">
            <ArrowRightLeft size={11} className="text-indigo-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-neutral-300 whitespace-nowrap">
              切換空間
            </span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full">
            {Object.entries({
              [RoomType.LIVING_ROOM]: '客廳',
              [RoomType.BEDROOM]: '臥室',
              [RoomType.DINING_ROOM]: '餐廳',
              [RoomType.OFFICE]: '書房',
              [RoomType.BATHROOM]: '衛浴',
              [RoomType.KITCHEN]: '廚房'
            }).map(([key, label]) => {
              const isCurrent = roomType === key;
              const displayLabel = label;
              return (
                <button
                  key={key}
                  disabled={isCurrent}
                  onClick={() => onRoomTypeChange?.(key as RoomType)}
                  className={`text-[10px] sm:text-[11px] px-2 py-1 rounded transition-all whitespace-nowrap cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-semibold shadow shadow-indigo-650/30'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row min-h-0 min-w-0 overflow-hidden">
        {/* 3D Interactive WebGL Canvas */}
        <div ref={containerRef} className="flex-1 min-w-0 min-h-[250px] sm:min-h-0 relative bg-neutral-900 group">
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing outline-none" />
          
          {/* Helper instruction floating card */}
          <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md border border-neutral-800 rounded-lg px-3 py-1.5 text-[10px] sm:text-xs text-neutral-400 font-medium pointer-events-none select-none flex items-center gap-2">
            <Info size={13} className="text-indigo-400 animate-pulse" />
            <span>拖曳旋轉、滾輪縮放，從不同角度檢查家具會不會太擠</span>
          </div>

          {/* HUD Quick POV adjust */}
          <div className="absolute bottom-4 left-4 flex gap-2 select-none z-10">
          <button 
            onClick={() => adjustCameraView('orbit')}
            className="flex items-center gap-1.5 bg-neutral-950/80 hover:bg-neutral-900 text-xs text-white px-2.5 py-1.5 rounded-lg border border-neutral-800 transition-all active:scale-95 shadow-lg shadow-black/40"
          >
            <Camera size={13} className="text-neutral-400" />
            3D 透視
          </button>
          <button 
            onClick={() => adjustCameraView('top')}
            className="flex items-center gap-1.5 bg-neutral-950/80 hover:bg-neutral-900 text-xs text-white px-2.5 py-1.5 rounded-lg border border-neutral-800 transition-all active:scale-95 shadow-lg shadow-black/40"
          >
            <Sliders size={13} className="text-indigo-400" />
            俯瞰平面
          </button>
          <button 
            onClick={() => adjustCameraView('front')}
            className="flex items-center gap-1.5 bg-neutral-950/80 hover:bg-neutral-900 text-xs text-white px-2.5 py-1.5 rounded-lg border border-neutral-800 transition-all active:scale-95 shadow-lg shadow-black/40"
          >
            <Eye size={13} className="text-neutral-400" />
            正立前視
          </button>
        </div>

        {/* HUD Snapshot Quick Export */}
        <button 
          onClick={handleExport3DImage}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-xs text-white px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/50"
          title="下載目前配置視角"
        >
          <Download size={13} />
          <span>下載配置圖</span>
        </button>
      </div>

      {/* Interactive Controls Panel */}
      <div className="w-full sm:w-[320px] md:w-[360px] bg-neutral-900 border-t sm:border-t-0 sm:border-l border-neutral-800/85 p-4 flex flex-col overflow-y-auto h-[260px] sm:h-full max-h-[260px] sm:max-h-full font-sans shrink-0">
        
        {/* Navigation Tabs for Beginner Friendliness */}
        <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800/90 select-none mb-4 shrink-0">
          <button
            onClick={() => setActivePanelTab('layout')}
            type="button"
            className={`py-2 rounded-lg text-[13px] font-bold text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${activePanelTab === 'layout' ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30' : 'bg-transparent text-neutral-400 hover:text-white'}`}
          >
            <Box size={14} className={activePanelTab === 'layout' ? 'text-white' : 'text-neutral-400'} />
            <span>空間尺寸</span>
          </button>
          <button
            onClick={() => setActivePanelTab('materials')}
            type="button"
            className={`py-2 rounded-lg text-[13px] font-bold text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${activePanelTab === 'materials' ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30' : 'bg-transparent text-neutral-400 hover:text-white'}`}
          >
            <Palette size={14} className={activePanelTab === 'materials' ? 'text-white' : 'text-neutral-400'} />
            <span>顏色材質</span>
          </button>
          <button
            onClick={() => setActivePanelTab('furniture')}
            type="button"
            className={`py-2 rounded-lg text-[13px] font-bold text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${activePanelTab === 'furniture' ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30' : 'bg-transparent text-neutral-400 hover:text-white'}`}
          >
            <Move size={14} className={activePanelTab === 'furniture' ? 'text-white' : 'text-neutral-400'} />
            <span>家具位置</span>
          </button>
        </div>

        <div className="flex-1 space-y-4">
          
          {/* TAB 1: LAYOUT & DOORS / WINDOWS */}
          {activePanelTab === 'layout' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Reset layout button */}
              <div className="flex justify-between items-center bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/85">
                <span className="text-[13px] text-neutral-400 font-semibold select-none">重置當前客製隔局尺寸</span>
                <button
                  onClick={resetWholeLayout}
                  className="text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 font-sans transition-all flex items-center gap-1 text-xs font-semibold border border-neutral-800 cursor-pointer"
                  title="重置格局與尺寸"
                >
                  <RotateCcw size={10} />
                  <span>重置</span>
                </button>
              </div>
              
              {/* Box 1: Dimensions */}
              <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                <h4 className="text-sm font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  📐 空間尺寸設定
                </h4>
                
                <div className="space-y-3 text-[13px]">
                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1.5">
                      <span>客製寬度 (Width):</span>
                      <span className="text-emerald-400 font-bold font-mono">{roomWidth} cm</span>
                    </div>
                    <input 
                      type="range" 
                      min="300" 
                      max="1000" 
                      step="10"
                      value={roomWidth} 
                      onChange={(e) => setRoomWidth(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1.5">
                      <span>客製長度 (Length / 深度):</span>
                      <span className="text-emerald-400 font-bold font-mono">{roomLength} cm</span>
                    </div>
                    <input 
                      type="range" 
                      min="300" 
                      max="1000" 
                      step="10"
                      value={roomLength} 
                      onChange={(e) => setRoomLength(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1.5">
                      <span>天花板高度 (Ceiling):</span>
                      <span className="text-emerald-400 font-bold font-mono">{roomHeight} cm</span>
                    </div>
                    <input 
                      type="range" 
                      min="200" 
                      max="450" 
                      step="5"
                      value={roomHeight} 
                      onChange={(e) => setRoomHeight(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="text-[13px] text-neutral-500 flex justify-between select-none pt-2 border-t border-neutral-800/55">
                  <span>* 建議規格：500 × 400 × 260 cm</span>
                  <button 
                    onClick={() => { setRoomWidth(500); setRoomLength(400); setRoomHeight(260); }}
                    className="text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
                  >
                    恢復預設
                  </button>
                </div>
              </div>

              {/* Box 2: Atmosphere & Daylight */}
              <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                <h4 className="text-sm font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  ☀️ 空間採光與夜間照明
                </h4>
                
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setTimeOfDay('day')}
                    className={`py-1.5 rounded-lg text-[13px] font-bold text-center transition-all cursor-pointer ${timeOfDay === 'day' ? 'bg-white text-black font-extrabold shadow-sm' : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-400'}`}
                  >
                    🌞 白天陽光
                  </button>
                  <button
                    onClick={() => setTimeOfDay('sunset')}
                    className={`py-1.5 rounded-lg text-[13px] font-bold text-center transition-all cursor-pointer ${timeOfDay === 'sunset' ? 'bg-orange-500 text-white font-extrabold shadow-sm' : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-400'}`}
                  >
                    🌇 夕陽餘暉
                  </button>
                  <button
                    onClick={() => setTimeOfDay('night')}
                    className={`py-1.5 rounded-lg text-[13px] font-bold text-center transition-all cursor-pointer ${timeOfDay === 'night' ? 'bg-indigo-900 text-white font-extrabold shadow-sm' : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-400'}`}
                  >
                    🌌 靜謐月夜
                  </button>
                </div>
                
                <div className="pt-1 select-none">
                  <button
                    onClick={() => setCustomLampsOn(!customLampsOn)}
                    className={`px-2.5 py-1.5 w-full rounded-lg text-[13px] font-bold transition-all cursor-pointer border ${customLampsOn ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-extrabold shadow-sm shadow-amber-500/10' : 'bg-neutral-800 border-transparent text-neutral-400 hover:text-neutral-300'}`}
                  >
                    {customLampsOn ? '💡 點擊切換氣氛燈：已啟動 ON' : '💡 點擊切換氣氛燈：未啟動 OFF'}
                  </button>
                </div>

                <div className="space-y-1 select-none pt-1">
                  <div className="flex justify-between text-[13px] text-neutral-400">
                    <span>💡 點選切換燈光色溫:</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setLightTemperature('white')}
                      className={`py-1.5 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${lightTemperature === 'white' ? 'bg-sky-550/10 border-sky-400 text-sky-400 font-extrabold shadow-sm' : 'bg-neutral-850 hover:bg-neutral-800 border-transparent text-neutral-400 hover:text-neutral-350'}`}
                    >
                      ⚪ 白光
                    </button>
                    <button
                      onClick={() => setLightTemperature('warmwhite')}
                      className={`py-1.5 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${lightTemperature === 'warmwhite' ? 'bg-amber-500/10 border-amber-400 text-amber-400 font-extrabold shadow-sm' : 'bg-neutral-850 hover:bg-neutral-800 border-transparent text-neutral-400 hover:text-neutral-350'}`}
                    >
                      🥛 暖白光
                    </button>
                    <button
                      onClick={() => setLightTemperature('warmyellow')}
                      className={`py-1.5 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${lightTemperature === 'warmyellow' ? 'bg-orange-500/10 border-orange-400 text-orange-400 font-extrabold shadow-sm' : 'bg-neutral-850 hover:bg-neutral-800 border-transparent text-neutral-400 hover:text-neutral-350'}`}
                    >
                      🍊 暖黃光
                    </button>
                  </div>
                </div>
              </div>

              {/* Box 3: Doors & Windows */}
              <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80 font-sans">
                <h4 className="text-sm font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  🚪 動線大門與採光窗戶
                </h4>

                {/* Door config */}
                <div className="space-y-2 pb-2 border-b border-neutral-800/50">
                  <div className="text-[13px] text-neutral-300 font-bold flex items-center gap-1.5">
                    <span>配置門扉 🚪</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[13px]">
                    <div>
                      <span className="text-neutral-400 block mb-1">大門樣式:</span>
                      <select
                        value={doorStyle}
                        onChange={(e) => setDoorStyle(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700/60 rounded px-1.5 py-1 text-white outline-none cursor-pointer text-[13px]"
                      >
                        <option value="modern">摩登平整主門</option>
                        <option value="traditional">經典美式線板門</option>
                        <option value="glass">鋼製長虹玻璃門</option>
                        <option value="sliding">北歐輕奢滑軌門</option>
                        <option value="double_modern">雙重摩登大門</option>
                        <option value="double_traditional">傳統優雅雙開門</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-neutral-400 block mb-1">安裝牆面:</span>
                      <select
                        value={doorPosition}
                        onChange={(e) => setDoorPosition(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700/60 rounded px-1.5 py-1 text-white outline-none cursor-pointer text-[13px]"
                      >
                        <option value="right">🧱 右側邊牆</option>
                        <option value="left">🧱 左側邊牆</option>
                        <option value="back">🧱 後方底牆</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[13px] pt-1.5">
                    <div>
                      <span className="text-neutral-400 block mb-1">大門平移位置:</span>
                      <input 
                        type="range" 
                        min="-1.8" 
                        max="1.8" 
                        step="0.1"
                        value={doorOffset} 
                        onChange={(e) => setDoorOffset(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-400 block mb-1">門板烤漆膜色:</span>
                      <div className="flex gap-1.5 items-center">
                        <input 
                          type="color" 
                          value={doorColor}
                          onChange={(e) => setDoorColor(e.target.value)}
                          className="w-6 h-5 bg-transparent border-none rounded cursor-pointer"
                        />
                        <span className="text-xs text-neutral-400 font-mono uppercase">{doorColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Window config */}
                <div className="space-y-2 pt-1">
                  <div className="text-[13px] text-neutral-300 font-bold flex items-center gap-1.5">
                    <span>配置窗框 🪟</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[13px]">
                    <div>
                      <span className="text-neutral-400 block mb-1">窗戶樣式:</span>
                      <select
                        value={windowStyle}
                        onChange={(e) => setWindowStyle(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700/60 rounded px-1.5 py-1 text-white outline-none cursor-pointer text-[13px]"
                      >
                        <option value="modern_single">摩登單開窗</option>
                        <option value="traditional_single">古典十字格格窗</option>
                        <option value="sliding">雙開上下滑動窗</option>
                        <option value="awning">輕奢外掀懸掛窗</option>
                        <option value="modern_double">大面落地雙聯窗</option>
                        <option value="traditional_double">古典田字格雙大窗</option>
                        <option value="fixed_vertical">極窄落地採光條</option>
                        <option value="fixed_horizontal">高窗橫帶採光井</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-neutral-400 block mb-1">安裝牆面:</span>
                      <select
                        value={windowPosition}
                        onChange={(e) => setWindowPosition(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700/60 rounded px-1.5 py-1 text-white outline-none cursor-pointer text-[13px]"
                      >
                        <option value="left">🧱 左側邊牆</option>
                        <option value="back">🧱 後方底牆</option>
                        <option value="right">🧱 右側邊牆</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[13px] pt-1.5">
                    <div>
                      <span className="text-neutral-400 block mb-1">窗底離地高度:</span>
                      <input 
                        type="range" 
                        min="0.3" 
                        max="2.1" 
                        step="0.05"
                        value={windowHeight} 
                        onChange={(e) => setWindowHeight(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-400 block mb-1">牆面平移位移:</span>
                      <input 
                        type="range" 
                        min="-2.0" 
                        max="2.0" 
                        step="0.1"
                        value={windowOffset} 
                        onChange={(e) => setWindowOffset(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-neutral-400 bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between gap-1 items-start select-none">
                    <span>📏 窗格自訂寬度 (Width):</span>
                    <div className="flex flex-col items-end gap-1 flex-1">
                      <input 
                        type="range" 
                        min="0.5" 
                        max="2.5" 
                        step="0.1"
                        value={windowWidth} 
                        onChange={(e) => setWindowWidth(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                      />
                      <span className="text-white font-mono mt-0.5">{windowWidth}m</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MATERIALS & STYLE INTERIOR */}
          {activePanelTab === 'materials' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Reset materials button */}
              <div className="flex justify-between items-center bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/85">
                <span className="text-[13px] text-neutral-400 font-semibold select-none">重置全域材質與色彩配置</span>
                <button
                  onClick={resetWholeMaterials}
                  className="text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 font-sans transition-all flex items-center gap-1 text-xs font-semibold border border-neutral-800 cursor-pointer"
                  title="重置材質與色彩"
                >
                  <RotateCcw size={10} />
                  <span>重置</span>
                </button>
              </div>
              
              {/* Floor Materials and Tiling Settings */}
              <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                <h4 className="text-sm font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  🪵 地板表面材質工藝
                </h4>
                
                <div className="space-y-1">
                  <label className="text-[13px] text-neutral-400 block">材質面層選擇:</label>
                  <select
                    value={floorStyle}
                    onChange={(e) => {
                      setFloorStyle(e.target.value);
                      setHerringbonePresetActive(false);
                    }}
                    className="w-full bg-neutral-800 border border-neutral-700/60 rounded px-2  py-1 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    {FLOOR_TYPES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[13px] pt-1">
                  <div>
                    <span className="text-neutral-400 block mb-1">地板光澤與霧面感:</span>
                    <input 
                      type="range" 
                      min="0.05" 
                      max="0.95" 
                      step="0.05"
                      value={floorRoughness} 
                      onChange={(e) => setFloorRoughness(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-neutral-400 block mb-1">貼圖紋理重複密度:</span>
                    <input 
                      type="range" 
                      min="0.3" 
                      max="3.0" 
                      step="0.1"
                      value={floorTiling} 
                      onChange={(e) => setFloorTiling(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-full outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Walls base material, wall accent, custom colors */}
              <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                <h4 className="text-sm font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
                  🎨 牆面漆色與底層紋理
                </h4>
                
                <div className="space-y-1">
                  <label className="text-[13px] text-neutral-400 block">牆面底材款式:</label>
                  <select
                    value={wallMaterialType}
                    onChange={(e) => setWallMaterialType(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700/60 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="paint">🎨 極簡平滑乳膠漆 (Matte Paint)</option>
                    <option value="wood">🪵 經典實木條分柵板 (Wood Panels)</option>
                    <option value="concrete">🧱 粗獷清水混凝土面 (Raw Concrete)</option>
                    <option value="plaster">✨ 威尼斯藝術微水泥藝術批土 (Plaster)</option>
                    <option value="tile">🧮 衛浴防潮亮面磁磚舖貼 (Ceramic Tiles)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-1 text-[13px]">
                  <span className="text-neutral-400 font-medium">自訂自選 RGB 牆色:</span>
                  <input 
                    type="checkbox" 
                    checked={wallUseCustomColor}
                    onChange={(e) => setWallUseCustomColor(e.target.checked)}
                    className="rounded bg-neutral-800 text-indigo-500 accent-indigo-500 cursor-pointer"
                  />
                </div>

                {wallUseCustomColor ? (
                  <div className="flex gap-2 items-center bg-neutral-900 border border-neutral-800 p-1.5 rounded-lg">
                    <span className="text-[13px] text-neutral-400">客製牆色:</span>
                    <input 
                      type="color" 
                      value={wallCustomColor}
                      onChange={(e) => setWallCustomColor(e.target.value)}
                      className="w-8 h-6 bg-transparent border-none rounded cursor-pointer"
                    />
                    <span className="text-[13px] text-white font-mono uppercase">{wallCustomColor}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[13px] text-neutral-400 block">預設漆色選擇:</label>
                    <select
                      value={wallColor}
                      onChange={(e) => {
                        setWallColor(e.target.value);
                        setConcreteWallAdded(false);
                      }}
                      className="w-full bg-neutral-800 border border-neutral-700/60 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                    >
                      {WALL_COLORS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Accent backwall setup */}
                <div className="pt-2.5 border-t border-neutral-800/50 space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-neutral-350 font-bold">主牆特色背牆 (Accent Wall):</span>
                    <button
                      onClick={() => setWallAccentEnabled(!wallAccentEnabled)}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer transition-all ${wallAccentEnabled ? 'bg-emerald-600 text-white shadow-sm' : 'bg-neutral-800 text-neutral-500 hover:text-neutral-400'}`}
                    >
                      {wallAccentEnabled ? '主牆特色已開啟' : '未開啟特色'}
                    </button>
                  </div>

                  {wallAccentEnabled && (
                    <div className="flex gap-2 items-center bg-neutral-900 border border-neutral-800 p-2 rounded-lg animate-in slide-in-from-top-1">
                      <span className="text-xs text-neutral-400">主背牆指定漆色:</span>
                      <input 
                        type="color" 
                        value={wallAccentColor}
                        onChange={(e) => setWallAccentColor(e.target.value)}
                        className="w-8 h-5 bg-transparent border-none rounded cursor-pointer"
                      />
                      <span className="text-[13px] text-white font-mono uppercase">{wallAccentColor}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: FURNITURE ADJUSTMENT & AI INTEGRATIONS */}
          {activePanelTab === 'furniture' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Single Consolidated Reset Button for Furniture & Soft Decoration */}
              <div className="flex justify-between items-center bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/85">
                <span className="text-[13px] text-neutral-400 font-semibold select-none">重置全域家具與軟裝擺設</span>
                <button 
                  onClick={() => {
                    resetFurniturePlacement();
                    resetDecorAdditions();
                  }}
                  className="text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 font-sans transition-all flex items-center gap-1 text-xs font-semibold border border-neutral-800 cursor-pointer"
                  title="一鍵重設家具擺設與自選飾物"
                >
                  <RotateCcw size={10} />
                  <span>重置</span>
                </button>
              </div>
              
              {/* Furniture translation tools container */}
              <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center text-sm">
                  <h4 className="font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    🛋️ 家具擺設位置微調
                  </h4>
                </div>
                

                {/* Target Furniture Selector Dropdown */}
                <div className="space-y-1">
                  <select
                    value={selectedFurniture}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedFurniture(val);
                      syncSlidersToDefault(roomType, val);
                    }}
                    className="w-full bg-neutral-800 border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-sans cursor-pointer focus:border-indigo-500 transition-all text-sm"
                  >
                    {roomType === RoomType.LIVING_ROOM && (
                      <>
                        <option value="sofa_or_bed">🛋️ 主沙發組合 (Sofa Group)</option>
                        <option value="coffee_table">☕ 圓形茶几 (Coffee Table)</option>
                        <option value="tv_console">📺 懸掛電視櫃 (TV Console)</option>
                      </>
                    )}
                    {roomType === RoomType.BEDROOM && (
                      <>
                        <option value="sofa_or_bed">🛏️ 臥室主床鋪 (Master Bed)</option>
                        <option value="stands">🗄️ 雙側床頭櫃與檯燈 (Nightstands)</option>
                      </>
                    )}
                    {roomType === RoomType.DINING_ROOM && (
                      <>
                        <option value="sofa_or_bed">🪑 六人座實木餐桌椅 (Dining Set)</option>
                        <option value="sideboard">🍷 輕奢餐邊收納櫃 (Sideboard)</option>
                      </>
                    )}
                    {roomType === RoomType.OFFICE && (
                      <>
                        <option value="sofa_or_bed">🖥️ 現代行政辦公桌椅 (Desk & Chair)</option>
                        <option value="bookcase">📚 滿牆高檔書架 (Bookcase)</option>
                      </>
                    )}
                    {roomType === RoomType.BATHROOM && (
                      <>
                        <option value="sofa_or_bed">🛁 現代獨立浴缸 (Bathtub)</option>
                        <option value="vanity">🧼 雙盆大理石洗手池 (Vanity)</option>
                        <option value="toilet">🚽 智能懸掛馬桶 (Smart Toilet)</option>
                      </>
                    )}
                    {roomType === RoomType.KITCHEN && (
                      <>
                        <option value="sofa_or_bed">🍳 豪華一字型中島廚櫃 (Kitchen Counter)</option>
                        <option value="fridge">❄️ 嵌入式雙門冰箱 (Smart Refrigerator)</option>
                      </>
                    )}
                    {roomType === RoomType.STUDIO && (
                      <>
                        <option value="sofa_or_bed">🛏️ 精緻單人床組 (Studio Bed)</option>
                        <option value="studio_sofa">🖥️ 職人工作書桌椅 (Desk & Chair)</option>
                        <option value="coffee_table">🗃️ 質感收納大衣櫃 (Wardrobe / Closet)</option>
                      </>
                    )}

                    {/* Accent items added via Preset / Phase 2 buttons */}
                    {wardrobeAdded && <option value="wardrobe">🗃️ 質感收納大衣櫃 (Wardrobe)</option>}
                    {plantAdded && <option value="accent_plant">🪴 羽裂龜背芋植栽 (Corner Plant)</option>}
                    {artworkAdded && <option value="accent_artwork">🎨 幾何極簡抽象藝術畫</option>}
                    {botanicalPrintAdded && <option value="botanical_print">🌿 莫蘭迪植物版畫</option>}
                    {abstractOilAdded && <option value="abstract_oil">🖼️ 抽象表現主義油畫</option>}
                    {japanInkAdded && <option value="japan_ink">🗻 日式水墨山水掛軸</option>}
                    {wineCabinetAdded && <option value="wine_cabinet">🍷 頂級玻璃恆溫酒櫃 (Wine Cabinet)</option>}
                    {catTowerAdded && <option value="cat_tower">🐱 寵物北歐實木貓攀架 (Cat Tower)</option>}
                    {barCartAdded && <option value="bar_cart">🥂 移動型白色大理石吧台車 (Bar Cart)</option>}
                    {floorLampAdded && <option value="accent_lamp">💡 落日星辰落地燈 (Floor Lamp)</option>}
                    {diffuserAdded && <option value="diffuser">🏺 工藝香氛擴香 (Aroma Diffuser)</option>}
                    {cushionsAdded && roomType !== RoomType.LIVING_ROOM && <option value="cushions">🛋️ 方形軟抱枕組 (Cozy Cushions)</option>}
                    {throwBlanketAdded && <option value="throw_blanket">🧶 風格織品披毯 (Throw Blanket)</option>}
                    {wallMirrorAdded && <option value="wall_mirror">🪞 圓形金屬框牆鏡 (Wall Mirror)</option>}
                    {tableLampAdded && <option value="table_lamp">🪔 摺紙百褶檯燈 (Pleated Table Lamp)</option>}
                    {vaseAdded && <option value="vase">🏺 芙蓉曜變花瓶 (Floral Vase)</option>}
                    {clockAdded && <option value="clock">🕰️ 現代藝術奢華掛鐘 (Art Wall Clock)</option>}
                    {shoeCabinetAdded && <option value="shoe_cabinet">👞 櫻桃木格柵鞋櫃 (Shoe Cabinet)</option>}
                    {mushroomLampAdded && <option value="mushroom_lamp">🍄 義式奶油玻璃蘑菇檯燈 (Mushroom Lamp)</option>}
                    {vintageLampAdded && <option value="vintage_lamp">📻 復古長型祖母綠書桌燈 (Banker Table Lamp)</option>}
                    {cantileverLampAdded && <option value="cantilever_lamp">💡 北歐極簡懸臂落地燈 (Cantilever Floor Lamp)</option>}
                    {retroSphereLampAdded && <option value="retro_sphere_lamp">💡 1970 太空球形落地燈 (Chrome Eyeball Floor Lamp)</option>}
                    {turntableAdded && <option value="turntable">🎵 職人手提黑膠唱片機 (Suitcase Record Player)</option>}
                    {sculptureAdded && <option value="sculpture">🧱 侘寂工藝石膏幾何雕塑 (Travertine Sculpture)</option>}
                    {stackedBooksAdded && <option value="stacked_books">📚 巴黎藝術史疊書與香氛 (Stacked Books & Candle)</option>}
                  </select>
                </div>

                {/* Range translation layout sliders */}
                <div className="space-y-3 pt-1 text-[13px]">
                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1.5">
                      <span>左右水平位移 (X軸):</span>
                      <span className="text-emerald-400 font-bold font-mono">{furnitureX.toFixed(2)}m</span>
                    </div>
                    <input 
                      type="range" 
                      min={Math.min(getFurnitureBounds(roomType, selectedFurniture).minX, getFurnitureBounds(roomType, selectedFurniture).maxX).toFixed(2)} 
                      max={Math.max(getFurnitureBounds(roomType, selectedFurniture).minX, getFurnitureBounds(roomType, selectedFurniture).maxX).toFixed(2)} 
                      step="0.02"
                      value={furnitureX} 
                      onChange={(e) => setFurnitureX(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-neutral-800 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1.5">
                      <span>前後深淺距離 (Z軸):</span>
                      <span className="text-emerald-400 font-bold font-mono">{furnitureZ.toFixed(2)}m</span>
                    </div>
                    <input 
                      type="range" 
                      min={Math.min(getFurnitureBounds(roomType, selectedFurniture).minZ, getFurnitureBounds(roomType, selectedFurniture).maxZ).toFixed(2)} 
                      max={Math.max(getFurnitureBounds(roomType, selectedFurniture).minZ, getFurnitureBounds(roomType, selectedFurniture).maxZ).toFixed(2)} 
                      step="0.02"
                      value={furnitureZ} 
                      onChange={(e) => setFurnitureZ(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-neutral-800 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1.5">
                      <span>上下垂直高度 (Y軸):</span>
                      <span className="text-emerald-400 font-bold font-mono">{(furnitureY >= 0 ? '+' : '')}{furnitureY.toFixed(2)}m</span>
                    </div>
                    <input 
                      type="range" 
                      min="-1.50" 
                      max="2.50" 
                      step="0.02"
                      value={furnitureY} 
                      onChange={(e) => setFurnitureY(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-neutral-800 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1.5">
                      <span>水平旋轉角度 (Rotation):</span>
                      <span className="text-emerald-400 font-bold font-mono">{Math.round(furnitureRot * (180 / Math.PI))}°</span>
                    </div>
                    <input 
                      type="range" 
                      min={-Math.PI} 
                      max={Math.PI} 
                      step={Math.PI / 48}
                      value={furnitureRot} 
                      onChange={(e) => setFurnitureRot(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-neutral-800 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1.5">
                      <span>等比例尺寸縮放:</span>
                      <span className="text-emerald-400 font-bold font-mono">{(furnitureScale * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.01"
                      value={furnitureScale} 
                      onChange={(e) => setFurnitureScale(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-neutral-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* Custom furniture type selector for Sofa Sizes and Beds */}
                  {roomType === RoomType.LIVING_ROOM && selectedFurniture === 'sofa_or_bed' && (
                    <div className="pt-2.5 border-t border-neutral-800/60 mt-1">
                      <div className="flex justify-between text-neutral-400 mb-1.5">
                        <span>主沙發規格款式:</span>
                      </div>
                      <select
                        value={sofaType}
                        onChange={(e) => setSofaType(e.target.value as any)}
                        className="w-full bg-neutral-950 border border-neutral-800/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-indigo-500 transition-all text-sm"
                      >
                        <option value="three">🛋️ 奢華三人沙發 (Three-Seater Sofa)</option>
                        <option value="two">🛋️ 精緻雙人沙發 (Two-Seater Sofa)</option>
                        <option value="l_shape">🛋️ 豪華 L 型沙發 (L-Shaped Sectional)</option>
                      </select>
                    </div>
                  )}

                  {(roomType === RoomType.BEDROOM || roomType === RoomType.STUDIO) && selectedFurniture === 'sofa_or_bed' && (
                    <div className="pt-2.5 border-t border-neutral-800/60 mt-1">
                      <div className="flex justify-between text-neutral-400 mb-1.5">
                        <span>睡床規格款式:</span>
                      </div>
                      <select
                        value={bedType}
                        onChange={(e) => setBedType(e.target.value as any)}
                        className="w-full bg-neutral-950 border border-neutral-800/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-indigo-500 transition-all text-sm"
                      >
                        <option value="double">🛏️ 雙人床配置 (Double Bed)</option>
                        <option value="single">🛏️ 單人床配置 (Single Bed)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Preset Elements Refinement (Taiwan Traditional Chinese with Room Categorizations and Filters!) */}
              <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-sm text-neutral-200 font-extrabold tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      家具、燈飾與軟裝搭配
                    </span>
                    <span className="mt-1 block text-[11px] text-neutral-500">依目前房型顯示可用項目</span>
                  </div>
                </div>

                {/* Category Filtering Tabs (Pills) */}
                <div className="flex flex-wrap gap-1 pb-1">
                  {[
                    { id: 'all', label: '全部' },
                    { id: 'core_furniture', label: '主要家具' },
                    { id: 'soft_furniture', label: '收納家具' },
                    { id: 'textiles', label: '織品/材質' },
                    { id: 'lighting', label: '燈飾' },
                    { id: 'accents', label: '擺飾/綠植' }
                  ].map(tab => (
                    <button
                       key={tab.id}
                       onClick={() => setSelectedPresetTab(tab.id as any)}
                       className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${selectedPresetTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-400'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Grid list of curated recommendation objects */}
                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                  {[
                    // --- Core Furniture Category ---
                    // Living Room
                    { key: 'living_sofa', rooms: [RoomType.LIVING_ROOM], name: '🛋️ 客廳核心沙發組', category: 'core_furniture', recLabel: '客廳核心', desc: '客廳舒適主座大沙發組，提供高密度回彈泡棉與奢華布藝面料。', active: livingSofaAdded, prompt: '在客廳中配置核心沙發座組' },
                    { key: 'living_coffee_table', rooms: [RoomType.LIVING_ROOM], name: '☕ 客廳圓形茶几', category: 'core_furniture', recLabel: '客廳核心', desc: '擺設於沙發前方的天然大理石圓形低盤茶几，點綴金屬細腿。', active: livingCoffeeTableAdded, prompt: '在客廳沙發前擺放天然石茶几' },
                    { key: 'living_tv_console', rooms: [RoomType.LIVING_ROOM], name: '📺 客廳懸空電視櫃', category: 'core_furniture', recLabel: '客廳核心', desc: '簡約橡木懸空抽屜式電視櫃，完美藏線且增加牆面輕盈立體感。', active: livingTvConsoleAdded, prompt: '在客廳電視牆下掛置橡木懸空櫃' },
                    // Bedroom
                    { key: 'bedroom_bed', rooms: [RoomType.BEDROOM], name: '🛏️ 臥室主床鋪', category: 'core_furniture', recLabel: '臥室核心', desc: '高級進口乳膠主床，搭配舒適棉麻高靠背與飽滿羽絨枕頭。', active: bedroomBedAdded, prompt: '在臥室正中安放寬敞舒適的主床' },
                    { key: 'bedroom_stands', rooms: [RoomType.BEDROOM], name: '🗄️ 臥室床頭櫃一組', category: 'core_furniture', recLabel: '臥室核心', desc: '主床兩側的雙抽屜對稱床頭儲物矮櫃。', active: bedroomStandsAdded, prompt: '在主床左右對稱安裝橡木床頭櫃' },
                    // Dining Room
                    { key: 'dining_set', rooms: [RoomType.DINING_ROOM], name: '🪑 餐廳實木餐桌椅組', category: 'core_furniture', recLabel: '餐廳核心', desc: '六人位北美實木餐桌，配有微軟真皮包覆透氣餐椅，極佳溫馨感。', active: diningSetAdded, prompt: '在餐廳中置入溫馨長型實木餐桌椅' },
                    // Office
                    { key: 'office_desk', rooms: [RoomType.OFFICE], name: '🖥️ 書房職人辦公桌椅組', category: 'core_furniture', recLabel: '書房核心', desc: '實木長型大辦公桌，搭配電競人體工學網椅，長時間工作腰椎無負擔。', active: officeDeskAdded, prompt: '在書房深處擺放職人工作大平桌與人體工學椅' },
                    // Bathroom
                    { key: 'bathroom_bathtub', rooms: [RoomType.BATHROOM], name: '🛁 浴室獨立橢圓浴缸', category: 'core_furniture', recLabel: '衛浴核心', desc: '一體成型高水準壓克力人造石独立浴缸，防污保溫效果極佳。', active: bathroomBathtubAdded, prompt: '在浴室靠牆擺設精緻橢圓獨立式浴缸' },
                    { key: 'bathroom_vanity', rooms: [RoomType.BATHROOM], name: '🚰 浴室大理石洗手池', category: 'core_furniture', recLabel: '衛浴核心', desc: '奢享岩板洗手台面，下方附有實木防潮雙層置物抽屜櫃。', active: bathroomVanityAdded, prompt: '在浴室靠背牆設置大理石洗手池與儲物櫃' },
                    { key: 'bathroom_toilet', rooms: [RoomType.BATHROOM], name: '🚽 浴室智能智慧馬桶', category: 'core_furniture', recLabel: '衛浴核心', desc: '極簡无水箱壁掛智能馬桶，帶有自動感應翻蓋、溫水洗淨與夜燈烘乾。', active: bathroomToiletAdded, prompt: '在衛浴安設極簡壁掛智能馬桶' },
                    { key: 'bathroom_shower', rooms: [RoomType.BATHROOM], name: '🚿 浴室淋浴花灑蓮蓬頭組', category: 'core_furniture', recLabel: '衛浴核心', desc: '乾濕分離頂級淋浴花灑，含一體式大雨淋頭、手持精緻蓮蓬頭及防爆鋼化玻璃屏。', active: bathroomShowerAdded, prompt: '在浴室角落佈置精緻淋浴套件及乾濕分離玻璃屏' },
                    // Kitchen
                    { key: 'kitchen_counter', rooms: [RoomType.KITCHEN], name: '🍳 廚房中島島台廚櫃', category: 'core_furniture', recLabel: '廚房核心', desc: '石英石防刮高白備料中島島台，整合了嵌入式電磁爐與實用洗滌水槽。', active: kitchenCounterAdded, prompt: '在廚房中央設置備料中島島台櫃體' },
                    { key: 'kitchen_fridge', rooms: [RoomType.KITCHEN], name: '❄️ 廚房嵌入式雙門冰箱', category: 'core_furniture', recLabel: '廚房核心', desc: '法式曜石黑雙開門大容量冰箱，節能一級標章，保留最新新鮮。', active: kitchenFridgeAdded, prompt: '在廚房牆體內嵌入大型法式對開門冰箱' },
                    // --- Textiles & Materials Category ---
                    { key: 'leather', rooms: [RoomType.LIVING_ROOM], name: '🛋️ 棕色皮革沙發面料', category: 'textiles', recLabel: '風格面料', desc: '切換沙發為富有人文歷史厚度與溫潤光澤的頂級棕色皮革。', active: leatherPresetActive, prompt: '將主沙發更換為溫潤色澤的頂級棕色皮革沙發' },
                    { key: 'area_rug', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO], name: '▰ 風格區域地毯', category: 'textiles', recLabel: '地面織品', desc: '依目前風格自動搭配低飽和、可襯托家具比例的區域地毯。', active: areaRugAdded, prompt: '在空間中央鋪設依風格搭配的柔軟區域地毯' },
                    { key: 'curtains', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO], name: '▥ 柔性窗簾布幔', category: 'textiles', recLabel: '窗邊織品', desc: '依窗戶位置加入兩側落地簾片，讓空間從硬邊框轉為更柔和的生活感。', active: curtainsAdded, prompt: '在窗邊配置與空間風格相襯的柔性窗簾' },
                    { key: 'throw_blanket', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.STUDIO], name: '▤ 風格織品披毯', category: 'textiles', recLabel: '沙發床品', desc: '在沙發座面或床尾加入折痕與流蘇細節，顏色會依空間風格自動搭配。', active: throwBlanketAdded, prompt: '在沙發或床尾加入與風格相襯的織品披毯' },
                    { key: 'cushions', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.STUDIO], name: '🛋️ 方形軟抱枕搭配', category: 'textiles', recLabel: '靠墊織品', desc: '客廳控制沙發本體抱枕，臥室與工作室則加入正方形、帶滾邊且依風格配色的靠面抱枕組。', active: cushionsAdded, prompt: '在沙發或床邊配置依風格搭配的方形軟抱枕' },

                    // --- Soft Furniture Category ---
                    { key: 'dining_sideboard', rooms: [RoomType.DINING_ROOM], name: '🪑 餐廳輕奢餐邊矮櫃', category: 'soft_furniture', recLabel: '風格儲物', desc: '北美胡桃木與半透長虹玻璃拼貼，收納餐盤及咖啡器具優美典雅。', active: diningSideboardAdded, prompt: '在餐廳牆邊配置輕奢長春花玻璃餐邊櫃' },
                    { key: 'office_bookcase', rooms: [RoomType.OFFICE], name: '📚 書房高檔隔板滿牆書櫃', category: 'soft_furniture', recLabel: '風格儲物', desc: '無背板大空間直落式多層書隔，隨心佈置藝術書籍與珍藏展品。', active: officeBookcaseAdded, prompt: '在書房牆面佈置通頂多層實木大書櫃' },
                    { key: 'wardrobe', rooms: [RoomType.BEDROOM], name: '🗃️ 臥室金屬收納大衣櫃', category: 'soft_furniture', recLabel: '風格儲物', desc: '極高對開高光澤烤漆長門板搭配精緻鍍金拉手，提供極致奢華的大幅床邊收納可能。', active: wardrobeAdded, prompt: '在臥室佈置一座簡潔美觀的高大收納衣櫃' },
                    { key: 'wine_cabinet', rooms: [RoomType.LIVING_ROOM, RoomType.DINING_ROOM], name: '🍷 餐廳玻璃恆溫落地酒櫃', category: 'soft_furniture', recLabel: '風格儲物', desc: '添置奢華黑色框架與暗黑色高透防爆玻璃的嵌入式落地酒櫃。', active: wineCabinetAdded, prompt: '在空間中添置一座優雅奢華的恆溫玻璃落地酒櫃' },
                    { key: 'bar_cart', rooms: [RoomType.LIVING_ROOM, RoomType.DINING_ROOM], name: '🥂 爵士白吧台手推車', category: 'soft_furniture', recLabel: '風格軟裝', desc: '拉絲黃銅金屬框架，上下雙層奢華大理石板與精緻酒具。', active: barCartAdded, prompt: '在空間擺設輕奢黃銅大理石頂級雙層移動吧台車' },
                    { key: 'cat_tower', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM], name: '🐱 實木貓咪攀爬架', category: 'soft_furniture', recLabel: '風格軟裝', desc: '進口松木多層跳台、劍麻實木抓柱與頂端圓形溫馨貓窩。', active: catTowerAdded, prompt: '設置北歐風格的松木貓爬架，結合天然麻繩抓柱' },
                    { key: 'shoe_cabinet', rooms: [RoomType.LIVING_ROOM, RoomType.STUDIO], name: '👞 櫻桃木格柵對開鞋櫃', category: 'soft_furniture', recLabel: '風格軟裝', desc: '傳統卡榫榫接、經典櫻桃木深沉色澤，飾有防塵通風格柵木板以及精美雙拉絲實心把手。', active: shoeCabinetAdded, prompt: '在玄關或角落擺設一座櫻桃木格柵雕工雙門鞋櫃' },

                    // --- Lighting Category ---
                    { key: 'lamp', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO], name: '💡 落日星辰角落地燈', category: 'lighting', recLabel: '燈飾照明', desc: '角落嵌入折射微瀾晚霞暖橘夕陽光影的落日藝術立燈。', active: floorLampAdded, prompt: '在角落或天花板邊緣導入柔和的暖黃色落日落地燈' },
                    { key: 'table_lamp', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.OFFICE], name: '🪔 摺紙百褶檯燈', category: 'lighting', recLabel: '燈飾照明', desc: '侘寂復古質地褶縐燈罩配上細巧黃銅燈橈，釋放宛如微風吹彿的靜謐暖調光晕。', active: tableLampAdded, prompt: '在床頭櫃或書桌頂部架設一座褶縐 Origami 百褶摺紙精緻精美檯燈' },
                    { key: 'mushroom_lamp', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM], name: '🍄 義式奶油玻璃蘑菇檯燈', category: 'lighting', recLabel: '復古蘑菇燈', desc: '亮麗的圓拱壓克力與吹製奶油玻璃燈身，折射出慵懶溫存的七十年代復古暖流。', active: mushroomLampAdded, prompt: '在房間中置入一展溫馨亮麗的義式奶油玻璃蘑菇檯燈' },
                    { key: 'vintage_lamp', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.OFFICE], name: '📻 復古長型祖母綠書桌燈', category: 'lighting', recLabel: '祖母綠檯燈', desc: '經典黃銅重基座拉絲燈桿配上瑩潤祖母綠玻璃，展現學院派與大正浪漫的優雅情懷。', active: vintageLampAdded, prompt: '在桌面上添置一盞極具年代感與浪漫文藝氣息的祖母綠玻璃檯燈' },
                    { key: 'cantilever_lamp', rooms: [RoomType.LIVING_ROOM, RoomType.OFFICE], name: '📐 北歐極簡懸臂折疊落地燈', category: 'lighting', recLabel: '懸臂設計燈', desc: '雙節可調彈性碳鋼懸臂設計，配手感微褶宣紙燈罩，提供安穩聚焦的精準投光角度。', active: cantileverLampAdded, prompt: '在角落擺設一盞充滿力學設計張力的極簡懸臂落地燈' },
                    { key: 'retro_sphere_lamp', rooms: [RoomType.LIVING_ROOM], name: '💡 1970 太空球形電鍍落地燈', category: 'lighting', recLabel: '太空前衛燈', desc: '三頭高低錯落分佈的電鍍高亮鍍鉻球形燈罩，折射全幅空間，自帶太空時代的前衛感。', active: retroSphereLampAdded, prompt: '在死角增設一組前衛藝術感的球形電鍍落地燈' },
                    {
                      key: 'ceiling_modern',
                      name: '💡 天花：現代極簡微米筒燈',
                      category: 'lighting',
                      recLabel: '嵌入筒燈',
                      desc: '天花角落嵌置四枚精緻金屬圓殼微米投射筒燈，散發乾淨明亮純白鹵素光效。',
                      active: ceilingLightPresetStyle === 'modern',
                      prompt: '將天花板燈飾切換為現代極簡微米投射筒燈'
                    },
                    {
                      key: 'ceiling_scandi',
                      name: '💡 天花：北歐漏斗暖白吊燈',
                      category: 'lighting',
                      recLabel: '吊燈照明',
                      desc: '懸吊一盞溫潤白砂漏斗錐形單頭吊燈，封裝淺梣木木質飾圈，注入極致舒活氛圍。',
                      active: ceilingLightPresetStyle === 'scandinavian',
                      prompt: '將天花板燈飾切換為北歐暖白漏斗吊燈'
                    },
                    {
                      key: 'ceiling_industrial',
                      name: '💡 天花：工業黑色軌道射燈',
                      category: 'lighting',
                      recLabel: '軌道射燈',
                      desc: '架設長條炭黑色金屬筒軌道，搭載三枚可手動調節角度的鋼材投射筒，呈現重工業質感。',
                      active: ceilingLightPresetStyle === 'industrial',
                      prompt: '將天花板燈飾切換為工業黑色軌道射燈'
                    },
                    {
                      key: 'ceiling_luxury',
                      name: '💡 天花：極奢星環雙層吊燈',
                      category: 'lighting',
                      recLabel: '奢想吊燈',
                      desc: '懸吊雙重非對稱交錯、透射萬千流金極光霓虹氣場的黃銅拉絲雙層環形星光吊燈。',
                      active: ceilingLightPresetStyle === 'luxury',
                      prompt: '將天花板燈飾切換為極奢黃銅星環雙層吊燈'
                    },

                    // --- Accents Category ---
                    {
                      key: 'plant',
                      rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO],
                      name: '🪴 羽裂龜背芋落地盆栽',
                      category: 'accents',
                      recLabel: '植物綠植',
                      desc: '常綠翠綠羽裂大型龜背芋落地盆栽，無白斑斑葉、呈現均勻健康的光彩與綠意。',
                      active: plantAdded,
                      prompt: '在房間角落佈置高雅的羽裂龜背芋盆栽'
                    },
                    {
                      key: 'art',
                      rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO],
                      name: '🎨 幾何極簡黑金抽象藝術畫',
                      category: 'accents',
                      recLabel: '牆壁裝飾',
                      desc: '深藍底色搭配黑金幾何分割、赤陶大圓、金色對角線帶，富含現代張力與輕奢撞色。',
                      active: artworkAdded,
                      prompt: '在主牆面懸掛一幅現代極簡手繪幾何抽象藝術畫作'
                    },
                    {
                      key: 'botanical_print',
                      rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO],
                      name: '🌿 莫蘭迪植物風格版畫',
                      category: 'accents',
                      recLabel: '牆壁裝飾',
                      desc: '淡雅白木框搭配奶白底色，以霧灰綠莖葉、腮紅花頭呈現莫蘭迪調性的植物學版畫。',
                      active: botanicalPrintAdded,
                      prompt: '在牆面掛設一幅莫蘭迪植物學風格的淡雅版畫'
                    },
                    {
                      key: 'abstract_oil',
                      rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO],
                      name: '🖼️ 抽象表現主義油畫',
                      category: 'accents',
                      recLabel: '牆壁裝飾',
                      desc: '深林綠底上恣意揮灑的朱紅筆觸、鎘黃爆發光感、鈷藍沉穩基調，具油彩肌理厚塗感。',
                      active: abstractOilAdded,
                      prompt: '在牆面掛設一幅抽象表現主義風格的大型油畫'
                    },
                    {
                      key: 'japan_ink',
                      rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO],
                      name: '🗻 日式水墨山水掛軸',
                      category: 'accents',
                      recLabel: '牆壁裝飾',
                      desc: '黑漆木桿懸掛宣紙捲軸，以水墨暈染繪出遠山疊嶂、松樹剪影、地平線與朱紅落款印章。',
                      active: japanInkAdded,
                      prompt: '在牆面懸掛一幅日式傳統水墨山水掛軸'
                    },
                    {
                      key: 'diffuser',
                      rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.BATHROOM, RoomType.OFFICE, RoomType.STUDIO],
                      name: '🏺 侘寂工藝香氛擴香',
                      category: 'accents',
                      recLabel: '桌面香氛',
                      desc: '於桌面或櫃體擺置陶土素燒香氛瓶，插上蘆葦細桿散發優雅沉靜的木質調舒壓香氣。',
                      active: diffuserAdded,
                      prompt: '在桌面上端置放優雅的工藝陶瓷香氛與蘆葦擴香'
                    },
                    {
                      key: 'vase',
                      rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO],
                      name: '🏺 芙蓉曜變冰裂釉花瓶',
                      category: 'accents',
                      recLabel: '日式花藝',
                      desc: '精緻的淡雅芙蓉冰裂釉瓷器，插上婀娜纖細的櫻花木與盛開花朵，增添禪意氛圍。',
                      active: vaseAdded,
                      prompt: '在空間中置放一尊淡雅冰裂釉工藝陶瓷花瓶點綴'
                    },
                    {
                      key: 'clock',
                      rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.KITCHEN, RoomType.STUDIO],
                      name: '🕰️ 現代金屬拉絲極簡指針掛鐘',
                      category: 'accents',
                      recLabel: '實用掛鐘',
                      desc: '金屬拉絲璀璨金邊框與極簡曜石黑指針，兼具實用計時與牆面高級立體浮雕感。',
                      active: clockAdded,
                      prompt: '在牆面掛設一座現代金屬拉絲極簡指針掛鐘'
                    },
                    { key: 'wall_mirror', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.STUDIO], name: '🪞 圓形金屬框牆鏡', category: 'accents', recLabel: '牆面裝飾', desc: '在主牆面加入圓形鏡面與細金屬外框，補足牆面層次與反射感。', active: wallMirrorAdded, prompt: '在主牆面配置一面圓形金屬框牆鏡' },
                    { key: 'turntable', rooms: [RoomType.LIVING_ROOM, RoomType.OFFICE], name: '🎵 職人手提黑膠唱片機', category: 'accents', recLabel: '黑膠文藝', desc: '懷舊皮質手提箱外觀內嵌全金屬黑膠唱片盤與精緻銅針，播放歲月留下的黑膠聲音。', active: turntableAdded, prompt: '在桌櫃或置物面佈設一台手提皮箱黑膠唱片機' },
                    { key: 'sculpture', rooms: [RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.DINING_ROOM, RoomType.OFFICE, RoomType.STUDIO], name: '🧱 侘寂工藝石膏幾何雕塑', category: 'accents', recLabel: '藝術雕塑', desc: '由洞石、米黃大理石相互平衡契合的工藝石雕飾品，散發內斂優雅的侘寂沈思氣質。', active: sculptureAdded, prompt: '在空間中的桌面或展示台置放一尊侘寂工藝石膏雕塑' },
                    { key: 'stacked_books', rooms: [RoomType.LIVING_ROOM, RoomType.OFFICE, RoomType.BEDROOM], name: '📚 巴黎藝術史疊書與香氛燭', category: 'accents', recLabel: '桌面藝文', desc: '經典精裝藝術與建築史畫冊整齊堆疊，其上靜置一只特調磨砂玻璃香草香氛蠟燭。', active: stackedBooksAdded, prompt: '在茶几或置物櫃面搭配一疊巴黎藝術史學疊書與頂部精美香氛蠟燭' }
                  ]
                    .filter(item => selectedPresetTab === 'all' || item.category === selectedPresetTab)
                    .filter(item => !(item as any).rooms || (item as any).rooms.includes(roomType))
                    .map(item => (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => handleToggleInternalRefinement(item.key, item.prompt)}
                        aria-pressed={item.active}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1 hover:bg-neutral-900/60 leading-normal ${item.active ? 'bg-indigo-950/20 border-indigo-500/80 shadow-md' : 'bg-neutral-900/40 border-neutral-800'}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[13px] font-bold text-neutral-100 leading-snug">{item.name}</span>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-semibold leading-none border ${item.active ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-neutral-850 border-neutral-800 text-neutral-500'}`}>
                            {item.recLabel}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-500 select-none leading-relaxed">
                          {item.desc}
                        </span>
                        <div className="flex justify-between items-center pt-1 mt-0.5 border-t border-neutral-800/40 select-none">
                          <span className="text-[11px] text-neutral-600">{item.active ? '已加入配置' : '可加入配置'}</span>
                          <div className="flex items-center gap-1 text-[11px] font-bold">
                            {item.active ? (
                              <span className="text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 size={10} /> 移除
                              </span>
                            ) : (
                              <span className="text-neutral-300">加入</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>

                {/* Micro-Adjustment Tips */}
                {(plantAdded || artworkAdded || botanicalPrintAdded || abstractOilAdded || japanInkAdded || wineCabinetAdded || catTowerAdded || barCartAdded || floorLampAdded || diffuserAdded || (cushionsAdded && roomType !== RoomType.LIVING_ROOM) || throwBlanketAdded || wallMirrorAdded || tableLampAdded || wardrobeAdded || mushroomLampAdded || vintageLampAdded || cantileverLampAdded || retroSphereLampAdded || turntableAdded || sculptureAdded || stackedBooksAdded) && (
                  <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-2 text-xs text-indigo-300 font-medium leading-relaxed leading-normal select-none animate-in fade-in">
                    已加入的物件可在上方「家具擺設位置微調」選取後調整位置、角度與比例。
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
   </div>
  );
};
