import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EmptySpaceLayout, EmptySpaceOpening, EmptySpaceWall } from '../types';

interface FloorPlanEmptyViewerProps {
  layout: EmptySpaceLayout;
}

const WALL_HEIGHT_M = 2.6;

const projectOntoLine = (
  px: number, pz: number,
  x1: number, z1: number, x2: number, z2: number,
): number | null => {
  const dx = x2 - x1, dz = z2 - z1;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-9) return null;
  return ((px - x1) * dx + (pz - z1) * dz) / len2;
};

const getOpeningsOnWall = (
  wall: EmptySpaceWall,
  openings: EmptySpaceOpening[],
  thicknessM: number,
) => {
  const x1 = wall.x1 / 100, z1 = wall.y1 / 100;
  const x2 = wall.x2 / 100, z2 = wall.y2 / 100;
  const wallLen = Math.hypot(x2 - x1, z2 - z1);
  if (wallLen < 0.01) return [];

  return openings
    .filter(op => {
      const t = projectOntoLine(op.x / 100, op.y / 100, x1, z1, x2, z2);
      if (t === null || t <= 0.02 || t >= 0.98) return false;
      const projX = x1 + t * (x2 - x1), projZ = z1 + t * (z2 - z1);
      return Math.hypot(op.x / 100 - projX, op.y / 100 - projZ) < thicknessM + 0.3;
    })
    .map(op => {
      const t = projectOntoLine(op.x / 100, op.y / 100, x1, z1, x2, z2)!;
      const halfW = (op.widthCm / 100 / 2) / wallLen;
      return { tStart: Math.max(0.01, t - halfW), tEnd: Math.min(0.99, t + halfW), op };
    })
    .sort((a, b) => a.tStart - b.tStart);
};

export const FloorPlanEmptyViewer: React.FC<FloorPlanEmptyViewerProps> = ({ layout }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.15;

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
    keyLight.position.set(3, 6, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xdce8ff, 0x151515, 0.55);
    scene.add(fillLight);

    const widthM = Math.max(2, (layout.bounds.maxX - layout.bounds.minX) / 100);
    const depthM = Math.max(2, (layout.bounds.maxY - layout.bounds.minY) / 100);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x202020,
      roughness: 0.75,
      metalness: 0.02,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(widthM, depthM), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(Math.max(widthM, depthM) * 1.4, 32, 0x2f2f2f, 0x191919);
    grid.position.y = 0.006;
    scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe6e3dd,
      roughness: 0.82,
      metalness: 0.0,
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0xbdb8ad,
      roughness: 0.7,
    });

    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x888070, roughness: 0.55 });

    // Build a list of points along a wall's path (straight, bezier, or polyline)
    const getWallPoints = (wall: EmptySpaceWall): Array<{ x: number; z: number }> => {
      const x1 = wall.x1 / 100, z1 = wall.y1 / 100;
      const x2 = wall.x2 / 100, z2 = wall.y2 / 100;
      const cps = wall.controlPoints;
      if (!cps || cps.length === 0) return [{ x: x1, z: z1 }, { x: x2, z: z2 }];
      if (cps.length === 1) {
        const cpx = cps[0].x / 100, cpz = cps[0].y / 100;
        const n = 10;
        return Array.from({ length: n + 1 }, (_, i) => {
          const t = i / n;
          return {
            x: (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpx + t * t * x2,
            z: (1 - t) * (1 - t) * z1 + 2 * (1 - t) * t * cpz + t * t * z2,
          };
        });
      }
      return [{ x: x1, z: z1 }, ...cps.map(cp => ({ x: cp.x / 100, z: cp.y / 100 })), { x: x2, z: z2 }];
    };

    for (const wall of layout.walls) {
      const pts = getWallPoints(wall);
      const thickness = Math.max(0.08, Math.min(0.22, wall.thicknessCm / 100));

      // For opening detection, use straight-line endpoints only
      const wallOpenings = getOpeningsOnWall(wall, layout.openings, thickness);

      // Render each sub-segment of the wall path
      for (let pi = 0; pi < pts.length - 1; pi++) {
        const x1 = pts[pi].x, z1 = pts[pi].z;
        const x2 = pts[pi + 1].x, z2 = pts[pi + 1].z;
        const dx = x2 - x1, dz = z2 - z1;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 0.05) continue;
        const angle = -Math.atan2(dz, dx);

        // Only apply opening cuts on the first (and only) segment of straight walls
        const isCurved = (wall.controlPoints?.length ?? 0) > 0;
        const openingsForSeg = (!isCurved && pi === 0) ? wallOpenings : [];

        const subSegments: Array<{ t0: number; t1: number }> = [];
        let cur = 0;
        for (const { tStart, tEnd } of openingsForSeg) {
          if (tStart > cur + 0.01) subSegments.push({ t0: cur, t1: tStart });
          cur = tEnd;
        }
        if (cur < 0.99) subSegments.push({ t0: cur, t1: 1 });
        if (subSegments.length === 0) subSegments.push({ t0: 0, t1: 1 });

        for (const { t0, t1 } of subSegments) {
          const sx1 = x1 + t0 * dx, sz1 = z1 + t0 * dz;
          const sx2 = x1 + t1 * dx, sz2 = z1 + t1 * dz;
          const len = Math.hypot(sx2 - sx1, sz2 - sz1);
          if (len < 0.05) continue;

          const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_HEIGHT_M, thickness), wallMat);
          mesh.position.set((sx1 + sx2) / 2, WALL_HEIGHT_M / 2, (sz1 + sz2) / 2);
          mesh.rotation.y = angle;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);

          const cap = new THREE.Mesh(new THREE.BoxGeometry(len, 0.035, thickness + 0.012), capMat);
          cap.position.set(mesh.position.x, WALL_HEIGHT_M + 0.017, mesh.position.z);
          cap.rotation.y = angle;
          cap.castShadow = true;
          scene.add(cap);
        }

        // Door frame jambs (straight walls only)
        for (const { tStart, tEnd, op } of openingsForSeg) {
          const frameH = Math.min(WALL_HEIGHT_M, 2.15);
          const frameW = Math.max(0.035, thickness * 0.18);
          for (const t of [tStart, tEnd]) {
            const fx = x1 + t * dx, fz = z1 + t * dz;
            const jamb = new THREE.Mesh(new THREE.BoxGeometry(frameW, frameH, thickness + 0.02), doorFrameMat);
            jamb.position.set(fx, frameH / 2, fz);
            jamb.rotation.y = angle;
            scene.add(jamb);
          }
          const tMid = (tStart + tEnd) / 2;
          const openingLen = Math.hypot((x1 + tEnd * dx) - (x1 + tStart * dx), (z1 + tEnd * dz) - (z1 + tStart * dz));
          const lintel = new THREE.Mesh(
            new THREE.BoxGeometry(openingLen + frameW, 0.12, thickness + 0.02),
            doorFrameMat,
          );
          lintel.position.set(x1 + tMid * dx, frameH + 0.06, z1 + tMid * dz);
          lintel.rotation.y = angle;
          scene.add(lintel);
          void op;
        }
      }
    }

    const maxDim = Math.max(widthM, depthM);
    camera.position.set(maxDim * 0.55, Math.max(4, maxDim * 0.65), maxDim * 0.9);
    controls.target.set(0, WALL_HEIGHT_M * 0.35, 0);
    controls.update();

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let animationFrame = 0;
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [layout]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-neutral-800 bg-black">
      <div ref={mountRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-xs text-neutral-300 shadow-xl shadow-black/30 backdrop-blur-md">
        <p className="font-bold text-white">空屋格局預覽</p>
        <p className="mt-1 text-[11px] text-neutral-500">
          牆體 {layout.walls.length} 段 · 開口 {layout.openings.length} 處
        </p>
        <p className="mt-0.5 text-[11px] text-neutral-600">
          {layout.scale.confidence === 'calibrated' ? '比例已校正' : '比例待校正'} · 信心 {Math.round(layout.diagnostics.averageWallConfidence * 100)}%
        </p>
      </div>
    </div>
  );
};
