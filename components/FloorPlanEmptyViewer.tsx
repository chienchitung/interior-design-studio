import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EmptySpaceLayout } from '../types';

interface FloorPlanEmptyViewerProps {
  layout: EmptySpaceLayout;
}

const WALL_HEIGHT_M = 2.6;

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

    for (const wall of layout.walls) {
      const x1 = wall.x1 / 100;
      const z1 = wall.y1 / 100;
      const x2 = wall.x2 / 100;
      const z2 = wall.y2 / 100;
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      if (length < 0.2) continue;

      const thickness = Math.max(0.08, Math.min(0.22, wall.thicknessCm / 100));
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(length, WALL_HEIGHT_M, thickness),
        wallMat,
      );
      mesh.position.set((x1 + x2) / 2, WALL_HEIGHT_M / 2, (z1 + z2) / 2);
      mesh.rotation.y = -Math.atan2(dz, dx);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.035, thickness + 0.012),
        capMat,
      );
      cap.position.set(mesh.position.x, WALL_HEIGHT_M + 0.017, mesh.position.z);
      cap.rotation.y = mesh.rotation.y;
      cap.castShadow = true;
      scene.add(cap);
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
          偵測牆體 {layout.walls.length} 段 · 比例待校正
        </p>
      </div>
    </div>
  );
};
