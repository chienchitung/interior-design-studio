import * as THREE from 'three';
import { DesignStyle } from '../types';

export interface StylePalette {
  couchColor: number;
  couchRoughness: number;
  couchMetalness: number;
  woodColor: number;
  woodRoughness: number;
  metalColor: number;
  metalMetalness: number;
  metalRoughness: number;
  pillowColors: number[];
  accentBlanketColor: number;
  cabinetColor: number;
  countertopColor: number;
  countertopRoughness: number;
  countertopMetalness: number;
}

export const getStylePalette = (style: DesignStyle): StylePalette => {
  switch (style) {
    case DesignStyle.MODERN:
      return {
        couchColor: 0x2d3238, // Charcoal grey
        couchRoughness: 0.65,
        couchMetalness: 0.0,
        woodColor: 0x1c1e22, // Very dark wood
        woodRoughness: 0.45,
        metalColor: 0xcccccc, // Bright chrome-like silver
        metalMetalness: 0.95,
        metalRoughness: 0.1,
        pillowColors: [0xefefef, 0x111111],
        accentBlanketColor: 0xd8d8d8,
        cabinetColor: 0x1c1c1e, // Graphite
        countertopColor: 0xefefef, // White quartz
        countertopRoughness: 0.15,
        countertopMetalness: 0.1,
      };
    case DesignStyle.MINIMALIST:
      return {
        couchColor: 0xf5f5f5, // Bone white
        couchRoughness: 0.9,
        couchMetalness: 0.0,
        woodColor: 0xdfdcd6, // Light ash wood
        woodRoughness: 0.7,
        metalColor: 0x1a1a1a, // Matte black
        metalMetalness: 0.9,
        metalRoughness: 0.5,
        pillowColors: [0xdddbd7, 0x555555],
        accentBlanketColor: 0xcccccc,
        cabinetColor: 0xf3f3f2, // Soft white
        countertopColor: 0xfafafa, // Seamless pure corian white
        countertopRoughness: 0.2,
        countertopMetalness: 0.0,
      };
    case DesignStyle.SCANDINAVIAN:
      return {
        couchColor: 0xd2d7df, // Soft heather grey fabric
        couchRoughness: 0.8,
        couchMetalness: 0.0,
        woodColor: 0xe8cfb2, // Light blonde wood (beech)
        woodRoughness: 0.6,
        metalColor: 0xe3c193, // Champagne brass
        metalMetalness: 0.85,
        metalRoughness: 0.2,
        pillowColors: [0xa5b1c2, 0x778ca3], // Dusty blues and greys
        accentBlanketColor: 0xc8d6e5,
        cabinetColor: 0xe8e6df, // Warm white
        countertopColor: 0xddc0a2, // Raw solid thick birch wood
        countertopRoughness: 0.7,
        countertopMetalness: 0.0,
      };
    case DesignStyle.INDUSTRIAL:
      return {
        couchColor: 0x5c4033, // Distressed dark brown
        couchRoughness: 0.45,
        couchMetalness: 0.2,
        woodColor: 0x423126, // Reclaimed dark rough wood
        woodRoughness: 0.85,
        metalColor: 0x2d3436, // Gunmetal / Cast iron
        metalMetalness: 0.9,
        metalRoughness: 0.4,
        pillowColors: [0x2f3542, 0x57606f],
        accentBlanketColor: 0x20242c,
        cabinetColor: 0x22252a, // Carbon grey
        countertopColor: 0x787a7d, // Industrial concrete slab
        countertopRoughness: 0.8,
        countertopMetalness: 0.1,
      };
    case DesignStyle.MID_CENTURY_MODERN:
      return {
        couchColor: 0x0a5f6b, // Vintage teal
        couchRoughness: 0.6,
        couchMetalness: 0.0,
        woodColor: 0x6e3d1c, // Classic rich walnut
        woodRoughness: 0.5,
        metalColor: 0xd4af37, // Polished brass
        metalMetalness: 0.9,
        metalRoughness: 0.15,
        pillowColors: [0xeccc68, 0xff7f50], // Mustard yellow and warm coral
        accentBlanketColor: 0xffa502,
        cabinetColor: 0x532f15, // Walnut console slats
        countertopColor: 0xefedd6, // Retro travertine marble/cream terrazzo
        countertopRoughness: 0.25,
        countertopMetalness: 0.0,
      };
    case DesignStyle.LUXURY:
      return {
        couchColor: 0x0d2b1f, // Deep royal emerald velvet
        couchRoughness: 0.5,
        couchMetalness: 0.0,
        woodColor: 0x111113, // High gloss piano black ebony
        woodRoughness: 0.3,
        metalColor: 0xfac42a, // Pure glowing gold
        metalMetalness: 0.98,
        metalRoughness: 0.05,
        pillowColors: [0xeccc68, 0x1a1a1a], // Golden and solid black cushions
        accentBlanketColor: 0x021c10,
        cabinetColor: 0x1a1b1d, // Charcoal luxury laminate
        countertopColor: 0xffffff, // Calacatta gold high gloss white marble
        countertopRoughness: 0.05,
        countertopMetalness: 0.15,
      };
    case DesignStyle.BOHEMIAN:
      return {
        couchColor: 0xca623a, // Terracotta/rust cloth
        couchRoughness: 0.85,
        couchMetalness: 0.0,
        woodColor: 0xaf7e56, // Natural bamboo/rattan warm tan wood
        woodRoughness: 0.65,
        metalColor: 0xb57c32, // Hammered antique gold / copper
        metalMetalness: 0.85,
        metalRoughness: 0.35,
        pillowColors: [0xfa8231, 0xeb3b5a], // Colorful woven tribal pillows
        accentBlanketColor: 0xf7b731, // Vibrant mustard throw
        cabinetColor: 0x8e7f67, // Olive-tinted distressed warm cabinet
        countertopColor: 0xdfd4bc, // Raw cream travertine stone
        countertopRoughness: 0.55,
        countertopMetalness: 0.0,
      };
    case DesignStyle.JAPANDI:
      return {
        couchColor: 0xe6dfd5, // Oatmeal organic grain linen
        couchRoughness: 0.95,
        couchMetalness: 0.0,
        woodColor: 0xdfc6ad, // Plain unstained sand cedar/hinoki
        woodRoughness: 0.75,
        metalColor: 0x222222, // Matte dark slate steel
        metalMetalness: 0.85,
        metalRoughness: 0.45,
        pillowColors: [0x8b857f, 0xc8c3bc], // Muted stone and dry clay tones
        accentBlanketColor: 0xa59c94,
        cabinetColor: 0xdcd1c2, // Light sand cedar
        countertopColor: 0xe1d6c3, // Ground travertine limestone
        countertopRoughness: 0.65,
        countertopMetalness: 0.0,
      };
    case DesignStyle.COASTAL:
      return {
        couchColor: 0x3d688c, // Maritime marine blue / oceanic slate blue
        couchRoughness: 0.8,
        couchMetalness: 0.0,
        woodColor: 0xeee6dd, // Sun-bleached whitewashed ash wood
        woodRoughness: 0.6,
        metalColor: 0xcccccc, // Brushed nickel / satin aluminum
        metalMetalness: 0.9,
        metalRoughness: 0.1,
        pillowColors: [0xf5f6fa, 0x6e828a], // Yacht-white and coastal grey-blue
        accentBlanketColor: 0xced6e0,
        cabinetColor: 0x70909c, // Soft maritime beach pebbles teal/blue-grey
        countertopColor: 0xf9f9fa, // Pristine shell-white fine marble
        countertopRoughness: 0.12,
        countertopMetalness: 0.0,
      };
    default:
      return {
        couchColor: 0xd1cbc4,
        couchRoughness: 0.8,
        couchMetalness: 0.0,
        woodColor: 0x7a503a,
        woodRoughness: 0.6,
        metalColor: 0xd4af37,
        metalMetalness: 0.9,
        metalRoughness: 0.15,
        pillowColors: [0x5a6d7a, 0xccd6dd],
        accentBlanketColor: 0xcc9f80,
        cabinetColor: 0x413730,
        countertopColor: 0xeeeeee,
        countertopRoughness: 0.2,
        countertopMetalness: 0.0,
      };
  }
};

// Shared highly reflective premium silver-chrome material for all kitchen & bathroom faucets
export const getFaucetChromeMaterial = (): THREE.MeshStandardMaterial => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf0f0f0,           // Pristine bright silver
    metalness: 1.0,            // Pure metallic reflection
    roughness: 0.03,           // Ultra smooth mirror-polished gloss
    clearcoat: 1.0,            // Layer of high-gloss lacquer
    clearcoatRoughness: 0.03,  // Perfectly clear reflections
    envMapIntensity: 1.5,      // Pop under ambient reflection lighting
  });
};

// Helper to apply interactive transformations to a selected sub-group
export const applyInteraction = (
  group: THREE.Group,
  isSelected: boolean,
  defaultZ: number,
  furnitureX: number,
  furnitureZ: number,
  furnitureRot: number,
  furnitureScale: number,
  defaultRot: number = 0,
  defaultX: number = 0,
  defaultScale: number = 1
) => {
  group.position.set(isSelected ? furnitureX : defaultX, 0, isSelected ? furnitureZ : defaultZ);
  group.rotation.y = isSelected ? furnitureRot : defaultRot;
  const s = isSelected ? furnitureScale : defaultScale;
  group.scale.set(s, s, s);
};

// 1. LIVING ROOM BUILDER
export const buildLivingRoomFurniture = (
  style: DesignStyle,
  couchMaterial: string,
  selectedFurniture: string,
  furnitureX: number,
  furnitureZ: number,
  furnitureRot: number,
  furnitureScale: number,
  roomW: number,
  roomD: number,
  sofaType: 'three' | 'two' | 'l_shape' = 'three'
): THREE.Group => {
  const group = new THREE.Group();

  const palette = getStylePalette(style);

  // Couch assembly
  const sofaGroup = new THREE.Group();
  sofaGroup.name = 'sofa_or_bed';

  let couchColor = palette.couchColor;
  let couchRoughness = palette.couchRoughness;
  let couchMetalness = palette.couchMetalness;
  if (couchMaterial === 'leather') {
    if (style === DesignStyle.INDUSTRIAL) {
      couchColor = 0x442714;
    } else if (style === DesignStyle.MINIMALIST || style === DesignStyle.MODERN) {
      couchColor = 0x18181a;
    } else if (style === DesignStyle.MID_CENTURY_MODERN) {
      couchColor = 0x8a4f21;
    } else if (style === DesignStyle.LUXURY) {
      couchColor = 0x221c17;
    } else {
      couchColor = 0x5a2d0c;
    }
    couchRoughness = 0.35;
    couchMetalness = 0.25;
  }

  const couchMat = new THREE.MeshStandardMaterial({
    color: couchColor,
    roughness: couchRoughness,
    metalness: couchMetalness,
  });

  const legsMat = new THREE.MeshStandardMaterial({
    color: palette.woodColor,
    roughness: palette.woodRoughness,
    metalness: 0.1
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: palette.metalColor,
    metalness: palette.metalMetalness,
    roughness: palette.metalRoughness
  });

  // Dynamic parameters based on sofaType
  const isLType = sofaType === 'l_shape';
  const isTwoSeater = sofaType === 'two';

  let baseFrameWidth = 3.02;
  let frameDepth = 0.92;
  let upholsteryWidth = 2.96;
  let seatOffsets = [-0.96, 0.0, 0.96];
  let seatWidth = 0.94;
  let backOffsets = [-0.96, 0.0, 0.96];
  let backWidth = 0.96;
  let armLeftX = -1.49;
  let armRightX = 1.49;
  let legOffsets = [
    [-1.38, -0.38], [1.38, -0.38],
    [-1.38, 0.38], [1.38, 0.38]
  ];

  if (isTwoSeater) {
    baseFrameWidth = 2.12;
    upholsteryWidth = 2.06;
    seatOffsets = [-0.51, 0.51];
    seatWidth = 0.98;
    backOffsets = [-0.51, 0.51];
    backWidth = 1.0;
    armLeftX = -1.04;
    armRightX = 1.04;
    legOffsets = [
      [-0.96, -0.38], [0.96, -0.38],
      [-0.96, 0.38], [0.96, 0.38]
    ];
  }

  // 1. Base Frame (Wooden or metal profile underline)
  const baseFrameGeo = new THREE.BoxGeometry(baseFrameWidth, 0.06, frameDepth);
  const baseFrameMat = new THREE.MeshStandardMaterial({
    color: palette.woodColor,
    roughness: palette.woodRoughness,
    metalness: palette.metalMetalness > 0.9 ? 0.3 : 0.1
  });
  const baseFrame = new THREE.Mesh(baseFrameGeo, baseFrameMat);
  baseFrame.position.set(0, 0.28, 0);
  baseFrame.castShadow = true;
  sofaGroup.add(baseFrame);

  // If L-shape sectional, add the forward extending lounge frame on the right side
  if (isLType) {
    const lFrameGeo = new THREE.BoxGeometry(0.96, 0.06, 0.88);
    const lFrame = new THREE.Mesh(lFrameGeo, baseFrameMat);
    lFrame.position.set(0.98, 0.28, 0.84); // extend forward +Z
    lFrame.castShadow = true;
    sofaGroup.add(lFrame);
  }

  // 2. Upholstered seat base
  const upholsteryBaseGeo = new THREE.BoxGeometry(upholsteryWidth, 0.18, 0.88);
  const upholsteryBase = new THREE.Mesh(upholsteryBaseGeo, couchMat);
  upholsteryBase.position.set(0, 0.4, 0.02);
  upholsteryBase.castShadow = true;
  sofaGroup.add(upholsteryBase);

  if (isLType) {
    const lUpholsteryGeo = new THREE.BoxGeometry(0.94, 0.18, 0.84);
    const lUpholstery = new THREE.Mesh(lUpholsteryGeo, couchMat);
    lUpholstery.position.set(0.96, 0.4, 0.84);
    lUpholstery.castShadow = true;
    sofaGroup.add(lUpholstery);
  }

  // 3. Segmented fluffy seat cushions
  seatOffsets.forEach((xOffset, idx) => {
    const seatSubGroup = new THREE.Group();

    // If L-sectional and this is the rightmost cushion, stretch it along the Z-axis
    let currentDepth = 0.76;
    let currentZ = 0.02;
    const isRightLChaise = isLType && idx === 2; // rightmost cushion on 3-seater

    if (isRightLChaise) {
      currentDepth = 1.62;
      currentZ = 0.45;
    }

    const currentSeatWidth = isRightLChaise ? 0.92 : seatWidth;
    const seatGeo = new THREE.BoxGeometry(currentSeatWidth, 0.16, currentDepth);
    const seatMesh = new THREE.Mesh(seatGeo, couchMat);
    seatMesh.castShadow = true;
    seatSubGroup.add(seatMesh);

    // Decorative piping trim around seat seams
    const pipeGeo = new THREE.CylinderGeometry(0.015, 0.015, currentSeatWidth, 8);
    const pipeL = new THREE.Mesh(pipeGeo, couchMat);
    pipeL.rotation.z = Math.PI / 2;
    pipeL.position.set(0, 0.08, currentDepth / 2);
    seatSubGroup.add(pipeL);

    seatSubGroup.position.set(xOffset, 0.52, currentZ);
    sofaGroup.add(seatSubGroup);
  });

  // 4. High upholstered backrest with vertical/fluted panels
  backOffsets.forEach((xOffset, idx) => {
    const backGeos = new THREE.BoxGeometry(idx === 2 && isLType ? backWidth - 0.04 : backWidth, 0.58, 0.18);
    const backSegment = new THREE.Mesh(backGeos, couchMat);
    // Slightly rotated back panel for organic tilt style
    backSegment.position.set(xOffset, 0.81, -0.37);
    backSegment.rotation.x = -0.06;
    backSegment.castShadow = true;
    sofaGroup.add(backSegment);
  });

  // 5. Curved stylized armrests (thick padded side bars)
  const armLGeo = new THREE.BoxGeometry(0.22, 0.56, 0.94);
  const armL = new THREE.Mesh(armLGeo, couchMat);
  armL.position.set(armLeftX, 0.61, 0.005);
  armL.castShadow = true;
  sofaGroup.add(armL);

  const armR = armL.clone();
  if (isLType) {
    // Extend right armrest slightly more forward to frame the modern lounge nicely
    armR.position.set(armRightX, 0.61, 0.44);
    armR.scale.set(1, 1, 1.95); // stretch along Z to span the extended lounge!
  } else {
    armR.position.x = armRightX;
  }
  sofaGroup.add(armR);

  // 6. Highly Optimized Realistic Fluffy/Puffy Pillows (Cushions)
  const pillowColor = palette.pillowColors[0] || 0x5a6d7a;
  const buildPillowMesh = (pColor: number, bColor: number) => {
    const pGroup = new THREE.Group();
    const pMat = new THREE.MeshStandardMaterial({
      color: pColor,
      roughness: 0.85
    });
    const btMat = new THREE.MeshStandardMaterial({
      color: bColor,
      roughness: 0.2,
      metalness: 0.8
    });

    // Make a round-cornered puffy pillow using overlapping scaled shapes
    // 1. Center plump core (squashed box)
    const pCore = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.08), pMat);
    pCore.castShadow = true;
    pGroup.add(pCore);

    // 2. High-volume center domes (front & back puff)
    const puffGeo = new THREE.SphereGeometry(0.19, 20, 20);
    const fPuff = new THREE.Mesh(puffGeo, pMat);
    fPuff.scale.set(1.05, 1.05, 0.45);
    fPuff.position.set(0, 0, 0.038);
    fPuff.castShadow = true;
    pGroup.add(fPuff);

    const bPuff = fPuff.clone();
    bPuff.position.z = -0.038;
    bPuff.rotation.y = Math.PI;
    pGroup.add(bPuff);

    // 3. Beveled borders (cylinders along edges)
    const borderCylGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.38, 12);
    
    const cyTop = new THREE.Mesh(borderCylGeo, pMat);
    cyTop.rotation.z = Math.PI / 2;
    cyTop.position.set(0, 0.19, 0);
    pGroup.add(cyTop);

    const cyBtm = cyTop.clone();
    cyBtm.position.y = -0.19;
    pGroup.add(cyBtm);

    const cyLeft = new THREE.Mesh(borderCylGeo, pMat);
    cyLeft.position.set(-0.19, 0, 0);
    pGroup.add(cyLeft);

    const cyRight = cyLeft.clone();
    cyRight.position.x = 0.19;
    pGroup.add(cyRight);

    // 4. Smooth corner vertices (sphere caps)
    const cornerSp = new THREE.SphereGeometry(0.04, 12, 12);
    const cornerOffsets = [[-0.19, 0.19], [0.19, 0.19], [-0.19, -0.19], [0.19, -0.19]];
    cornerOffsets.forEach(([cx, cy]) => {
      const cornerM = new THREE.Mesh(cornerSp, pMat);
      cornerM.position.set(cx, cy, 0);
      pGroup.add(cornerM);
    });

    // 5. Classic central tufted button
    const btnGeo = new THREE.SphereGeometry(0.016, 12, 12);
    const btnF = new THREE.Mesh(btnGeo, btMat);
    btnF.position.set(0, 0, 0.082);
    btnF.castShadow = true;
    pGroup.add(btnF);

    const btnB = btnF.clone();
    btnB.position.z = -0.082;
    pGroup.add(btnB);

    return pGroup;
  };

  // Left pillow leaning naturally against armrest
  const pillow1Group = buildPillowMesh(pillowColor, palette.metalColor);
  pillow1Group.position.set(armLeftX + 0.31, 0.65, -0.21);
  pillow1Group.rotation.set(0.1, Math.PI / 10, -0.15);
  sofaGroup.add(pillow1Group);

  // Right pillow leaning naturally
  const pillow2Group = buildPillowMesh(pillowColor, palette.metalColor);
  if (isLType) {
    pillow2Group.position.set(armRightX - 0.31, 0.65, 0.38); // shifted forward along custom lounge
    pillow2Group.rotation.set(0.1, -Math.PI / 10, 0.15);
  } else {
    pillow2Group.position.set(armRightX - 0.31, 0.65, -0.21);
    pillow2Group.rotation.set(0.1, -Math.PI / 10, 0.15);
  }
  sofaGroup.add(pillow2Group);

  // If L-shaped sectional, add a cozy third throw pillow propped in the corner!
  if (isLType) {
    const cornerColor = palette.pillowColors[1] || 0xd2b48c;
    const cornerPillow = buildPillowMesh(cornerColor, palette.metalColor);
    cornerPillow.position.set(0.52, 0.65, -0.21);
    cornerPillow.rotation.set(0.12, 0.05, 0.08);
    sofaGroup.add(cornerPillow);
  }

  // 7. Designer legs configuration (Extra legs added dynamically for sectional stability)
  if (isLType) {
    legOffsets.push([0.96, 1.18], [1.38, 1.18]); // support end of chaise lounge
  }

  legOffsets.forEach(([lx, lz]) => {
    const legSubGroup = new THREE.Group();

    // Wood/Metal main shaft tapered cylinder
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.22, 12);
    const shaft = new THREE.Mesh(shaftGeo, legsMat);
    shaft.position.y = 0.14;
    shaft.castShadow = true;
    legSubGroup.add(shaft);

    // Golden brass slipper cap at bottom
    const slipperGeo = new THREE.CylinderGeometry(0.021, 0.018, 0.05, 12);
    const slipper = new THREE.Mesh(slipperGeo, brassMat);
    slipper.position.y = 0.025;
    slipper.castShadow = true;
    legSubGroup.add(slipper);

    legSubGroup.position.set(lx, 0, lz);
    sofaGroup.add(legSubGroup);
  });

  const defaultSofaZ = roomD / 2 - 0.53;
  applyInteraction(sofaGroup, selectedFurniture === 'sofa_or_bed', defaultSofaZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, Math.PI);
  group.add(sofaGroup);

  // Coffee table assembly
  const coffeeTableGroup = new THREE.Group();
  coffeeTableGroup.name = 'coffee_table';

  const tableTopMat = new THREE.MeshStandardMaterial({
    color: palette.countertopColor,
    roughness: palette.countertopRoughness,
    metalness: palette.countertopMetalness,
  });

  // Layered Table Top (with beveled profile reveal)
  const topSubGroup = new THREE.Group();
  
  const tableTopGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.038, 48);
  const mainTableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
  mainTableTop.position.y = 0.345;
  mainTableTop.castShadow = true;
  mainTableTop.receiveShadow = true;
  topSubGroup.add(mainTableTop);

  // Brushed brass rim collar around the table edge
  const rimGeo = new THREE.CylinderGeometry(0.605, 0.605, 0.02, 48, 1, true);
  const rim = new THREE.Mesh(rimGeo, brassMat);
  rim.position.y = 0.345;
  topSubGroup.add(rim);

  coffeeTableGroup.add(topSubGroup);

  // Fluted architectural rod column base instead of raw wireframe (Elegant Designer Look)
  const flutedBaseGroup = new THREE.Group();
  const numRods = 18;
  const baseRadius = 0.44;
  const rodGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8);
  for (let i = 0; i < numRods; i++) {
    const angle = (i / numRods) * Math.PI * 2;
    const rx = Math.cos(angle) * baseRadius;
    const rz = Math.sin(angle) * baseRadius;
    
    const rod = new THREE.Mesh(rodGeo, brassMat);
    rod.position.set(rx, 0.16, rz);
    rod.castShadow = true;
    flutedBaseGroup.add(rod);
  }

  // Bottom metallic heavy stabilizer ring
  const ringGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.02, 32, 1, true);
  const bottomRing = new THREE.Mesh(ringGeo, brassMat);
  bottomRing.position.y = 0.01;
  flutedBaseGroup.add(bottomRing);

  coffeeTableGroup.add(flutedBaseGroup);

  const defaultCoffeeTableZ = roomD / 2 - 1.50;
  applyInteraction(coffeeTableGroup, selectedFurniture === 'coffee_table', defaultCoffeeTableZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(coffeeTableGroup);

  // TV Console Assembly
  const tvConsoleGroup = new THREE.Group();
  tvConsoleGroup.name = 'tv_console';

  // Beautiful oak/walnut multi-cabinet body
  const consoleBodyMat = new THREE.MeshStandardMaterial({
    color: palette.woodColor,
    roughness: palette.woodRoughness
  });
  const consoleBaseMat = new THREE.MeshStandardMaterial({
    color: palette.metalColor,
    metalness: palette.metalMetalness,
    roughness: palette.metalRoughness
  });

  // Main console block
  const consoleGeo = new THREE.BoxGeometry(2.38, 0.38, 0.44);
  const consoleMesh = new THREE.Mesh(consoleGeo, consoleBodyMat);
  consoleMesh.position.y = 0.23;
  consoleMesh.castShadow = true;
  consoleMesh.receiveShadow = true;
  tvConsoleGroup.add(consoleMesh);

  // Elegant brass knobs and inset lines signifying doors / wooden drawers
  const handlesGroup = new THREE.Group();
  const drawerSeamMat = new THREE.MeshStandardMaterial({ color: 0x181008, roughness: 0.9 });
  
  // Vertical seam cuts
  const seamGeo = new THREE.BoxGeometry(0.005, 0.36, 0.005);
  const seam1 = new THREE.Mesh(seamGeo, drawerSeamMat);
  seam1.position.set(-0.79, 0.23, 0.22);
  handlesGroup.add(seam1);

  const seam2 = seam1.clone();
  seam2.position.set(0.0, 0.23, 0.22);
  handlesGroup.add(seam2);

  const seam3 = seam1.clone();
  seam3.position.set(0.79, 0.23, 0.22);
  handlesGroup.add(seam3);

  // Smart brass pull-handles
  const pullGeo = new THREE.BoxGeometry(0.08, 0.012, 0.02);
  const hOffsets = [-1.18, -0.4, 0.4, 1.18];
  hOffsets.forEach(hX => {
    const pull = new THREE.Mesh(pullGeo, brassMat);
    pull.position.set(hX, 0.23, 0.225);
    pull.castShadow = true;
    handlesGroup.add(pull);
  });
  tvConsoleGroup.add(handlesGroup);

  // Slim elevated metal runner support legs
  const supportRunnerGeo = new THREE.BoxGeometry(2.3, 0.04, 0.38);
  const supportRunner = new THREE.Mesh(supportRunnerGeo, consoleBaseMat);
  supportRunner.position.y = 0.04;
  tvConsoleGroup.add(supportRunner);

  const rLegL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.38), consoleBaseMat);
  rLegL.position.set(-1.12, 0.02, 0);
  tvConsoleGroup.add(rLegL);

  const rLegR = rLegL.clone();
  rLegR.position.x = 1.12;
  tvConsoleGroup.add(rLegR);

  // Modern television
  const tvFrameGeo = new THREE.BoxGeometry(1.64, 0.94, 0.04);
  const tvFrame = new THREE.Mesh(tvFrameGeo, new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.2 }));
  tvFrame.position.set(0, 1.25, -0.15);
  tvFrame.castShadow = true;
  tvConsoleGroup.add(tvFrame);

  const tvScreenGeo = new THREE.BoxGeometry(1.59, 0.89, 0.015);
  const tvScreen = new THREE.Mesh(tvScreenGeo, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.12, metalness: 0.1 }));
  tvScreen.position.set(0, 1.25, -0.13);
  tvConsoleGroup.add(tvScreen);

  // High-fidelity audio soundbar below the screen
  const soundbarGeo = new THREE.BoxGeometry(0.9, 0.048, 0.08);
  const soundbarMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.75 });
  const soundbar = new THREE.Mesh(soundbarGeo, soundbarMat);
  soundbar.position.set(0, 0.444, 0.04);
  soundbar.castShadow = true;
  tvConsoleGroup.add(soundbar);

  const soundbarGlow = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), new THREE.MeshBasicMaterial({ color: 0x44ff44 }));
  soundbarGlow.position.set(0.42, 0.444, 0.084);
  tvConsoleGroup.add(soundbarGlow);

  const defaultTVConsoleZ = -roomD / 2 + 0.25;
  applyInteraction(tvConsoleGroup, selectedFurniture === 'tv_console', defaultTVConsoleZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(tvConsoleGroup);

  return group;
};

// 2. BEDROOM BUILDER
export const buildBedroomFurniture = (
  style: DesignStyle,
  selectedFurniture: string,
  furnitureX: number,
  furnitureZ: number,
  furnitureRot: number,
  furnitureScale: number,
  roomW: number,
  roomD: number,
  lampsAreLit: boolean = false,
  wardrobeAdded: boolean = false,
  lightTemperature: 'white' | 'warmwhite' | 'warmyellow' = 'warmwhite',
  bedType: 'double' | 'single' = 'double'
): THREE.Group => {
  const group = new THREE.Group();

  const bedGroup = new THREE.Group();
  bedGroup.name = 'sofa_or_bed';

  const palette = getStylePalette(style);

  const woodBedMat = new THREE.MeshStandardMaterial({
    color: palette.woodColor,
    roughness: palette.woodRoughness
  });
  const fabricHeadboardMat = new THREE.MeshStandardMaterial({
    color: palette.couchColor,
    roughness: palette.couchRoughness
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: palette.metalColor,
    metalness: palette.metalMetalness,
    roughness: palette.metalRoughness
  });

  const isSingle = bedType === 'single';
  const bedWidth = isSingle ? 1.4 : 2.1;
  const mattressWidth = isSingle ? 1.35 : 2.0;

  // 1. Platform Bed Base (elevated slightly above the floor)
  const baseFrameGeo = new THREE.BoxGeometry(bedWidth, 0.16, 1.94);
  const baseFrame = new THREE.Mesh(baseFrameGeo, woodBedMat);
  baseFrame.position.y = 0.22;
  baseFrame.castShadow = true;
  baseFrame.receiveShadow = true;
  bedGroup.add(baseFrame);

  // Tiny support legs underneath platform frame
  const postGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.14, 12);
  const postsOffsets = isSingle
    ? [[-0.6, -0.85], [0.6, -0.85], [-0.6, 0.85], [0.6, 0.85]]
    : [[-0.95, -0.85], [0.95, -0.85], [-0.95, 0.85], [0.95, 0.85]];
  postsOffsets.forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, brassMat);
    post.position.set(px, 0.07, pz);
    post.castShadow = true;
    bedGroup.add(post);
  });

  // 2. Channel-Tufted Luxury Headboard (segmented into beautiful vertical panels)
  const headboardGroup = new THREE.Group();
  const numPanels = isSingle ? 3 : 4;
  const totalW = bedWidth;
  const panelW = totalW / numPanels;
  const panelGeo = new THREE.BoxGeometry(panelW - 0.012, 1.15, 0.14);
  
  for (let i = 0; i < numPanels; i++) {
    const xPos = -totalW / 2 + panelW / 2 + i * panelW;
    const panel = new THREE.Mesh(panelGeo, fabricHeadboardMat);
    panel.position.set(xPos, 0.68, -0.93);
    panel.castShadow = true;
    headboardGroup.add(panel);

    // Decorative wood flanking frame bands
    if (i === 0 || i === numPanels - 1) {
      const flankGeo = new THREE.BoxGeometry(0.015, 1.15, 0.148);
      const flank = new THREE.Mesh(flankGeo, woodBedMat);
      flank.position.set(xPos + (i === 0 ? -panelW / 2 : panelW / 2), 0.68, -0.93);
      headboardGroup.add(flank);
    }
  }
  bedGroup.add(headboardGroup);

  // 3. Mattress
  const mattressGeo = new THREE.BoxGeometry(mattressWidth, 0.28, 1.82);
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xfbfbfb, roughness: 0.95 });
  const mattress = new THREE.Mesh(mattressGeo, mattressMat);
  mattress.position.set(0, 0.44, 0.04);
  mattress.castShadow = true;
  mattress.receiveShadow = true;
  bedGroup.add(mattress);

  // 4. Luxury Double-Layered Pillow Stacks
  // Stacking is key: 2 large sleeping pillows tilted back, 2 decorative pillows propped forward
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const frontPillowMat = new THREE.MeshStandardMaterial({
    color: palette.pillowColors[0] || 0x5a6d7a,
    roughness: 0.8
  });
  const sleepingPillowGeo = new THREE.BoxGeometry(0.68, 0.14, 0.44);
  const decoPillowGeo = new THREE.BoxGeometry(0.5, 0.12, 0.36);

  if (isSingle) {
    // Single Bed: Just one center sleeping pillow and one deco pillow stack
    const pillowB = new THREE.Mesh(sleepingPillowGeo, pillowMat);
    pillowB.position.set(0, 0.63, -0.66);
    pillowB.rotation.set(0.18, 0, 0);
    pillowB.castShadow = true;
    bedGroup.add(pillowB);

    const pillowF = new THREE.Mesh(decoPillowGeo, frontPillowMat);
    pillowF.position.set(0, 0.64, -0.48);
    pillowF.rotation.set(0.38, 0.05, 0);
    pillowF.castShadow = true;
    bedGroup.add(pillowF);
  } else {
    // Back left sleeping pillow (tilted)
    const pillowBL = new THREE.Mesh(sleepingPillowGeo, pillowMat);
    pillowBL.position.set(-0.46, 0.63, -0.66);
    pillowBL.rotation.set(0.18, 0, 0);
    pillowBL.castShadow = true;
    bedGroup.add(pillowBL);

    // Back right sleeping pillow
    const pillowBR = pillowBL.clone();
    pillowBR.position.x = 0.46;
    bedGroup.add(pillowBR);

    // Front left decorative pillow (more vertical tilt + colored accent)
    const pillowFL = new THREE.Mesh(decoPillowGeo, frontPillowMat);
    pillowFL.position.set(-0.42, 0.64, -0.48);
    pillowFL.rotation.set(0.38, 0.08, -0.05);
    pillowFL.castShadow = true;
    bedGroup.add(pillowFL);

    // Front right decorative pillow
    const pillowFR = pillowFL.clone();
    pillowFR.position.x = 0.42;
    pillowFR.rotation.y = -0.08;
    pillowFR.rotation.z = 0.05;
    bedGroup.add(pillowFR);
  }

  // 5. Layered Draped Duvet/Comforter (much realistic, drapes naturally over the mattress edges!)
  const duvetColor = palette.couchColor; // This will give it the primary style canvas color, stunning!
  const duvetMat = new THREE.MeshStandardMaterial({ color: duvetColor, roughness: 0.9 });
  const sheetAccentColor = 0xf5f5f5;
  const sheetAccentMat = new THREE.MeshStandardMaterial({ color: sheetAccentColor, roughness: 0.95 });

  const duvetGroup = new THREE.Group();

  const duvetWidthTop = mattressWidth + 0.04;
  const duvetHalfWidth = duvetWidthTop / 2;

  // Top piece comforter
  const duvetTopGeo = new THREE.BoxGeometry(duvetWidthTop, 0.038, 1.08);
  const duvetTop = new THREE.Mesh(duvetTopGeo, duvetMat);
  duvetTop.position.set(0, 0.59, 0.38);
  duvetTop.castShadow = true;
  duvetGroup.add(duvetTop);

  // Left drapery hanging down mattress side
  const duvetLeftGeo = new THREE.BoxGeometry(0.038, 0.24, 1.08);
  const duvetLeft = new THREE.Mesh(duvetLeftGeo, duvetMat);
  duvetLeft.position.set(-duvetHalfWidth, 0.47, 0.38);
  duvetLeft.castShadow = true;
  duvetGroup.add(duvetLeft);

  // Right drapery hanging down mattress side
  const duvetRight = duvetLeft.clone();
  duvetRight.position.x = duvetHalfWidth;
  duvetGroup.add(duvetRight);

  // Foot-of-bed drapery hanging down over the end
  const duvetFootGeo = new THREE.BoxGeometry(mattressWidth, 0.24, 0.038);
  const duvetFoot = new THREE.Mesh(duvetFootGeo, duvetMat);
  duvetFoot.position.set(0, 0.47, 0.92);
  duvetFoot.castShadow = true;
  duvetGroup.add(duvetFoot);

  // Beautiful folded sheet accent overlay at the chest level
  const sheetFoldGeo = new THREE.BoxGeometry(duvetWidthTop - 0.01, 0.015, 0.22);
  const sheetFold = new THREE.Mesh(sheetFoldGeo, sheetAccentMat);
  sheetFold.position.set(0, 0.595, -0.18);
  sheetFold.castShadow = true;
  duvetGroup.add(sheetFold);

  bedGroup.add(duvetGroup);

  const defaultBedZ = -roomD / 2 + 1.25;
  applyInteraction(bedGroup, selectedFurniture === 'sofa_or_bed', defaultBedZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(bedGroup);

  // Nightstands (Elegant drawers setup with wooden drawer divisions)
  const standsGroup = new THREE.Group();
  standsGroup.name = 'stands';

  const standOffset = Math.min(1.42, roomW / 2 - 0.35);

  const createDesignerStand = (xPos: number) => {
    const standSub = new THREE.Group();

    // Main cabinet body box
    const bodyMat = new THREE.MeshStandardMaterial({
      color: palette.woodColor,
      roughness: palette.woodRoughness
    });
    const mainBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.44), bodyMat);
    mainBox.position.y = 0.31;
    mainBox.castShadow = true;
    mainBox.receiveShadow = true;
    standSub.add(mainBox);

    // Front drawer facade divisions
    const frontMat = new THREE.MeshStandardMaterial({
      color: palette.cabinetColor,
      roughness: 0.7
    });
    const drawerSeam = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.005, 0.01), new THREE.MeshStandardMaterial({ color: 0x181008 }));
    drawerSeam.position.set(0, 0.31, 0.211);
    standSub.add(drawerSeam);

    // Dynamic metallic pulls/handles
    const handleGeo = new THREE.BoxGeometry(0.12, 0.015, 0.015);
    const topHandle = new THREE.Mesh(handleGeo, brassMat);
    topHandle.position.set(0, 0.38, 0.215);
    topHandle.castShadow = true;
    standSub.add(topHandle);

    const bottomHandle = topHandle.clone();
    bottomHandle.position.y = 0.22;
    standSub.add(bottomHandle);

    // Slender legs elevating the cabinet
    const sLegGeo = new THREE.CylinderGeometry(0.02, 0.014, 0.12, 8);
    const legCoords = [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]];
    legCoords.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(sLegGeo, bodyMat);
      leg.position.set(lx, 0.06, lz);
      leg.castShadow = true;
      standSub.add(leg);

      const footCap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.03, 8), brassMat);
      footCap.position.set(lx, 0.015, lz);
      standSub.add(footCap);
    });

    standSub.position.set(xPos, 0, -0.9);
    return standSub;
  };

  const leftStandSub = createDesignerStand(-standOffset);
  standsGroup.add(leftStandSub);

  const rightStandSub = createDesignerStand(standOffset);
  standsGroup.add(rightStandSub);

  // Bedside Lamps (Flared modern ceramic task lamps with gold stems)
  const lampBaseMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2 });
  const lampStemMat = brassMat;
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

  const createBedsideLamp = (xPos: number) => {
    const lampG = new THREE.Group();

    // Flared circular ceramic base
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 16), lampBaseMat);
    baseMesh.position.y = 0.55;
    baseMesh.castShadow = true;
    lampG.add(baseMesh);

    // Delicate gold metallic stem stalk
    const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8), lampStemMat);
    stemMesh.position.y = 0.65;
    lampG.add(stemMesh);

    // Conical lamp shade
    const shadeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.18, 16), shadeMat);
    shadeMesh.position.y = 0.78;
    shadeMesh.castShadow = true;
    lampG.add(shadeMesh);

    // Active illumination setup
    if (lampsAreLit) {
      // Warm bedside point light (castShadow is disabled to avoid headboard shadow casting harsh rectangular blocks on wall)
      const lightColor = lightTemperature === 'white' ? 0xf2f6ff : lightTemperature === 'warmwhite' ? 0xffeed5 : 0xffb566;
      const lampLight = new THREE.PointLight(lightColor, 1.8, 5);
      lampLight.position.set(0, 0.85, 0.05); // Move slightly forward for better glow distribution
      lampLight.castShadow = false;
      lampG.add(lampLight);

      // Embedded glowing bulb sphere
      const bulbMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffeebb })
      );
      bulbMesh.position.set(0, 0.72, 0);
      lampG.add(bulbMesh);
    }

    lampG.position.set(xPos, 0, -0.9);
    return lampG;
  };

  standsGroup.add(createBedsideLamp(-standOffset));
  standsGroup.add(createBedsideLamp(standOffset));

  applyInteraction(standsGroup, selectedFurniture === 'stands', defaultBedZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(standsGroup);

  // --- WARDROBE / CLOSET (Style-coordinated modular wardrobe) ---
  // Only added when selected in 軟裝推薦 to remove it from default bedroom setup
  if (wardrobeAdded) {
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.name = 'wardrobe';

    const woodWrdMat = new THREE.MeshStandardMaterial({
      color: palette.cabinetColor,
      roughness: palette.woodRoughness
    });
    const trimGoldMat = new THREE.MeshStandardMaterial({
      color: palette.metalColor,
      metalness: palette.metalMetalness,
      roughness: palette.metalRoughness
    });

    // Main Closet cabinet body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.95, 0.58), woodWrdMat);
    body.position.y = 0.975;
    body.castShadow = true;
    body.receiveShadow = true;
    wardrobeGroup.add(body);

    // Double door split groove
    const splitLine = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1.9, 0.585), new THREE.MeshStandardMaterial({ color: 0x181008, roughness: 0.9 }));
    splitLine.position.set(0, 0.975, 0.001);
    wardrobeGroup.add(splitLine);

    // Style-coordinated design highlights (Luxury and Modern get elegant glass doors)
    if (style === DesignStyle.LUXURY || style === DesignStyle.MODERN) {
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        metalness: 0.9
      });
      const paneL = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.7, 0.01), glassMat);
      paneL.position.set(-0.25, 0.975, 0.291);
      wardrobeGroup.add(paneL);

      const paneR = paneL.clone();
      paneR.position.x = 0.25;
      wardrobeGroup.add(paneR);
    }

    // Double metallic door handles
    const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.015), trimGoldMat);
    handleL.position.set(-0.04, 1.0, 0.292);
    handleL.castShadow = true;
    wardrobeGroup.add(handleL);

    const handleR = handleL.clone();
    handleR.position.x = 0.04;
    wardrobeGroup.add(handleR);

    // Wardrobe top molding
    const topMolding = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.04, 0.62), woodWrdMat);
    topMolding.position.y = 1.965;
    topMolding.castShadow = true;
    wardrobeGroup.add(topMolding);

    // Bottom base plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.58), new THREE.MeshStandardMaterial({ color: palette.woodColor, roughness: palette.woodRoughness }));
    plinth.position.y = 0.03;
    plinth.castShadow = true;
    wardrobeGroup.add(plinth);

    // Double door frame borders for more texture
    const borderFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.01), new THREE.MeshStandardMaterial({ color: palette.woodColor, roughness: palette.woodRoughness }));
    borderFrameL.position.set(-0.28, 0.975, 0.286);
    wardrobeGroup.add(borderFrameL);

    const borderFrameR = borderFrameL.clone();
    borderFrameR.position.x = 0.28;
    wardrobeGroup.add(borderFrameR);

    // Default positioning: right side front corner or side wall
    const defaultWardrobeX = -1.85;
    const defaultWardrobeZ = 1.22;
    const defaultWardrobeRot = 86 * Math.PI / 180;

    // Rotate wardrobe so its front faces left to orient directly towards the bed
    applyInteraction(wardrobeGroup, selectedFurniture === 'wardrobe', defaultWardrobeZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, defaultWardrobeRot, defaultWardrobeX);
    group.add(wardrobeGroup);
  }

  return group;
};

// 3. DINING ROOM BUILDER
export const buildDiningRoomFurniture = (
  style: DesignStyle,
  selectedFurniture: string,
  furnitureX: number,
  furnitureZ: number,
  furnitureRot: number,
  furnitureScale: number,
  roomW: number,
  roomD: number,
  roomH: number = 2.6
): THREE.Group => {
  const group = new THREE.Group();

  const tableGroup = new THREE.Group();
  tableGroup.name = 'sofa_or_bed';

  const palette = getStylePalette(style);

  const tableMat = new THREE.MeshStandardMaterial({
    color: palette.countertopColor,
    roughness: palette.countertopRoughness,
    metalness: palette.countertopMetalness
  });

  const legMat = new THREE.MeshStandardMaterial({
    color: palette.woodColor,
    roughness: palette.woodRoughness,
    metalness: 0.1
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: palette.metalColor,
    metalness: palette.metalMetalness,
    roughness: palette.metalRoughness
  });

  // 1. Table Top (with gold trim banding)
  const tabletopGroup = new THREE.Group();
  const tableTopGeo = new THREE.BoxGeometry(1.9, 0.048, 1.05);
  const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
  tableTop.position.y = 0.74;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tabletopGroup.add(tableTop);

  // Elegant brass under-rim trim
  const subRimGeo = new THREE.BoxGeometry(1.92, 0.015, 1.07);
  const subRim = new THREE.Mesh(subRimGeo, goldMat);
  subRim.position.y = 0.71;
  tabletopGroup.add(subRim);

  // Soft design touch: Fabric table runner draped across the center
  const runnerMat = new THREE.MeshStandardMaterial({ color: palette.pillowColors[1] || 0xded8cc, roughness: 0.95 });
  const runnerTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.004, 1.055), runnerMat);
  runnerTop.position.y = 0.766;
  tabletopGroup.add(runnerTop);

  // Runner drape edges
  const runnerDrapeL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.004), runnerMat);
  runnerDrapeL.position.set(0, 0.697, 0.528);
  tabletopGroup.add(runnerDrapeL);

  const runnerDrapeR = runnerDrapeL.clone();
  runnerDrapeR.position.z = -0.528;
  tabletopGroup.add(runnerDrapeR);

  tableGroup.add(tabletopGroup);

  // Twin Column H-legs (styled like architectural metal pillars)
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.68, 0.85), legMat);
  legL.position.set(-0.65, 0.34, 0);
  legL.castShadow = true;
  tableGroup.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.65;
  tableGroup.add(legR);

  const stretchCol = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.04, 0.04), legMat);
  stretchCol.position.set(0, 0.15, 0);
  tableGroup.add(stretchCol);

  // 6 Chairs Spaced (sculpted backs and tapered angled legs)
  const paddingMat = new THREE.MeshStandardMaterial({
    color: palette.couchColor,
    roughness: palette.couchRoughness
  });

  const chairList = [
    [-0.55, -0.6, 0],
    [0.55, -0.6, 0],
    [-0.55, 0.6, Math.PI],
    [0.55, 0.6, Math.PI],
    [-1.08, 0, Math.PI / 2],
    [1.08, 0, -Math.PI / 2]
  ];

  chairList.forEach(([cx, cz, crot]) => {
    const chair = new THREE.Group();
    
    // Contoured seat cushion
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), paddingMat);
    cushion.position.y = 0.45;
    cushion.castShadow = true;
    chair.add(cushion);

    // Stylish upholstered backrest with wood flanking splats
    const backGroup = new THREE.Group();
    const backCushion = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.038), paddingMat);
    backCushion.position.set(0, 0.66, -0.19);
    backCushion.castShadow = true;
    backGroup.add(backCushion);

    const backStrapL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.44, 0.02), legMat);
    backStrapL.position.set(-0.19, 0.63, -0.19);
    backGroup.add(backStrapL);

    const backStrapR = backStrapL.clone();
    backStrapR.position.x = 0.19;
    backGroup.add(backStrapR);

    chair.add(backGroup);

    // Tapered legs angled outward for mid-century modern look
    const sLegOffset = 0.165;
    const legCyl = new THREE.CylinderGeometry(0.016, 0.008, 0.43, 8);
    
    const flGeo = new THREE.Mesh(legCyl, legMat);
    flGeo.position.set(-sLegOffset, 0.215, sLegOffset);
    flGeo.rotation.set(0.08, 0, -0.08); // angle out
    flGeo.castShadow = true;
    chair.add(flGeo);

    const frGeo = flGeo.clone();
    frGeo.position.x = sLegOffset;
    frGeo.rotation.z = 0.08;
    chair.add(frGeo);

    const blGeo = flGeo.clone();
    blGeo.position.z = -sLegOffset;
    blGeo.rotation.x = -0.08;
    chair.add(blGeo);

    const brGeo = frGeo.clone();
    brGeo.position.z = -sLegOffset;
    brGeo.rotation.x = -0.08;
    chair.add(brGeo);

    // Decorative brass cups at chair bottom
    const glInt = new THREE.CylinderGeometry(0.01, 0.008, 0.03, 8);
    const glSleeve = new THREE.Mesh(glInt, goldMat);
    glSleeve.position.y = 0.015;
    
    // Add caps to legs
    const glCoords = [
      [-sLegOffset, sLegOffset], [sLegOffset, sLegOffset], [-sLegOffset, -sLegOffset], [sLegOffset, -sLegOffset]
    ];
    glCoords.forEach(([lx, lz]) => {
      const sleeve = glSleeve.clone();
      sleeve.position.set(lx, 0.015, lz);
      chair.add(sleeve);
    });

    chair.position.set(cx, 0, cz);
    chair.rotation.y = crot;
    tableGroup.add(chair);
  });

  const defaultTableZ = 0.1;
  applyInteraction(tableGroup, selectedFurniture === 'sofa_or_bed', defaultTableZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(tableGroup);

  // Sideboard credenza
  const sideboardGroup = new THREE.Group();
  sideboardGroup.name = 'sideboard';

  const sbPalette = getStylePalette(style);

  // Body: cabinetColor or woodColor
  const sbMat = new THREE.MeshStandardMaterial({
    color: sbPalette.cabinetColor,
    roughness: sbPalette.woodRoughness || 0.6
  });

  // Top marble/wood counter slab
  const countertopMat = new THREE.MeshStandardMaterial({
    color: sbPalette.countertopColor,
    roughness: sbPalette.countertopRoughness,
    metalness: sbPalette.countertopMetalness
  });

  // Base cabinet body (reduced height 0.66)
  const sbBody = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.64, 0.44), sbMat);
  sbBody.position.y = 0.32;
  sbBody.castShadow = true;
  sbBody.receiveShadow = true;
  sideboardGroup.add(sbBody);

  // Premium Top plate surface layer (0.04 height)
  const sbTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.46), countertopMat);
  sbTop.position.y = 0.662; 
  sbTop.castShadow = true;
  sideboardGroup.add(sbTop);

  // Modern doors with different presentation depending on style
  let doorMat: THREE.MeshStandardMaterial;
  if (style === DesignStyle.INDUSTRIAL) {
    doorMat = new THREE.MeshStandardMaterial({ color: 0x1f1f21, roughness: 0.6, metalness: 0.5 });
  } else if (style === DesignStyle.MINIMALIST || style === DesignStyle.JAPANDI) {
    doorMat = new THREE.MeshStandardMaterial({ color: sbPalette.woodColor, roughness: 0.8 });
  } else {
    doorMat = new THREE.MeshStandardMaterial({ color: sbPalette.woodColor, roughness: 0.45 });
  }

  // Classic transparency transparent doors for selected styles
  const isGlassDoorStyle = (style === DesignStyle.LUXURY || style === DesignStyle.MID_CENTURY_MODERN || style === DesignStyle.MODERN || style === DesignStyle.SCANDINAVIAN);
  
  let glassColorOut = 0x111111;
  let glassOpacityOut = 0.35;
  if (style === DesignStyle.LUXURY) {
    glassColorOut = 0x332211; // Golden ambient smoky glass
    glassOpacityOut = 0.5;
  } else if (style === DesignStyle.SCANDINAVIAN) {
    glassColorOut = 0xffffff; // Frosted high gloss white glass
    glassOpacityOut = 0.25;
  }

  const sbDoorMat = isGlassDoorStyle 
    ? new THREE.MeshStandardMaterial({ color: glassColorOut, transparent: true, opacity: glassOpacityOut, roughness: 0.15 })
    : doorMat;

  const sbDoor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.54, 0.02), sbDoorMat);
  sbDoor.position.set(-0.46, 0.33, 0.22);
  sbDoor.castShadow = true;
  sideboardGroup.add(sbDoor);

  const sbDoorR = sbDoor.clone();
  sbDoorR.position.x = 0.46;
  sideboardGroup.add(sbDoorR);

  // --- Add Style Specific Surface Enhancements to the Sideboard Doors ---
  if (style === DesignStyle.JAPANDI) {
    // Beautiful Hinoki wood horizontal slat grids on the doors
    const slatMat = new THREE.MeshStandardMaterial({ color: sbPalette.woodColor, roughness: 0.75 });
    const slatGeo = new THREE.BoxGeometry(0.86, 0.015, 0.005);
    for (let dy = -0.22; dy <= 0.22; dy += 0.08) {
      const slatL = new THREE.Mesh(slatGeo, slatMat);
      slatL.position.set(-0.46, 0.33 + dy, 0.231);
      sideboardGroup.add(slatL);

      const slatR = slatL.clone();
      slatR.position.x = 0.46;
      sideboardGroup.add(slatR);
    }
  } else if (style === DesignStyle.INDUSTRIAL) {
    // Rugged diamond iron wire mesh grid overlays on doors
    const meshLineMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.5, metalness: 0.9 });
    const meshBarGeo = new THREE.BoxGeometry(0.86, 0.004, 0.004);
    for (let dy = -0.21; dy <= 0.21; dy += 0.07) {
      const barL = new THREE.Mesh(meshBarGeo, meshLineMat);
      barL.position.set(-0.46, 0.33 + dy, 0.231);
      sideboardGroup.add(barL);

      const barR = barL.clone();
      barR.position.x = 0.46;
      sideboardGroup.add(barR);
    }
  } else if (style === DesignStyle.LUXURY) {
    // Elegant gold frame border around the glass panels
    const goldFrameMat = new THREE.MeshStandardMaterial({ color: sbPalette.metalColor, metalness: 0.95, roughness: 0.1 });
    const outlineTGroup = new THREE.Group();
    
    // Left door gold frame borders
    const hBorder = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.012, 0.006), goldFrameMat);
    const vBorder = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.52, 0.006), goldFrameMat);

    const borderTopL = hBorder.clone();
    borderTopL.position.set(-0.46, 0.59, 0.231);
    outlineTGroup.add(borderTopL);

    const borderBottomL = hBorder.clone();
    borderBottomL.position.set(-0.46, 0.07, 0.231);
    outlineTGroup.add(borderBottomL);

    const borderLeftL = vBorder.clone();
    borderLeftL.position.set(-0.89, 0.33, 0.231);
    outlineTGroup.add(borderLeftL);

    const borderRightL = vBorder.clone();
    borderRightL.position.set(-0.03, 0.33, 0.231);
    outlineTGroup.add(borderRightL);

    // Right door gold frame borders
    const borderTopR = hBorder.clone();
    borderTopR.position.set(0.46, 0.59, 0.231);
    outlineTGroup.add(borderTopR);

    const borderBottomR = hBorder.clone();
    borderBottomR.position.set(0.46, 0.07, 0.231);
    outlineTGroup.add(borderBottomR);

    const borderLeftR = vBorder.clone();
    borderLeftR.position.set(0.03, 0.33, 0.231);
    outlineTGroup.add(borderLeftR);

    const borderRightR = vBorder.clone();
    borderRightR.position.set(0.89, 0.33, 0.231);
    outlineTGroup.add(borderRightR);

    sideboardGroup.add(outlineTGroup);
  }

  // Elegant drawer pulls / handles matching the style's metal color!
  const handleMat = new THREE.MeshStandardMaterial({
    color: sbPalette.metalColor,
    metalness: sbPalette.metalMetalness,
    roughness: sbPalette.metalRoughness
  });
  const handleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8);
  const leftHandle = new THREE.Mesh(handleGeo, handleMat);
  leftHandle.rotation.z = Math.PI / 2;
  leftHandle.position.set(-0.16, 0.33, 0.232);
  sideboardGroup.add(leftHandle);

  const rightHandle = leftHandle.clone();
  rightHandle.position.x = 0.16;
  sideboardGroup.add(rightHandle);

  // Metallic feet in metal color
  const feetMat = new THREE.MeshStandardMaterial({
    color: sbPalette.metalColor,
    metalness: sbPalette.metalMetalness,
    roughness: sbPalette.metalRoughness
  });

  const footOffsets = [[-0.9, -0.19], [0.9, -0.19], [-0.9, 0.19], [0.9, 0.19]];
  
  if (style === DesignStyle.SCANDINAVIAN || style === DesignStyle.BOHEMIAN || style === DesignStyle.MID_CENTURY_MODERN) {
    // Outward tapered/angled vintage wooden down-peg style feet!
    const woodenFootMat = new THREE.MeshStandardMaterial({ color: sbPalette.woodColor, roughness: sbPalette.woodRoughness });
    const angledFootGeo = new THREE.CylinderGeometry(0.024, 0.015, 0.12, 10);
    
    footOffsets.forEach(([fx, fz]) => {
      const flGroup = new THREE.Group();
      const fl = new THREE.Mesh(angledFootGeo, woodenFootMat);
      fl.position.y = 0.06;
      flGroup.add(fl);
      
      // Pivot tipping angle depending on position corners
      fl.rotation.z = (fx < 0) ? 0.15 : -0.15;
      fl.rotation.x = (fz < 0) ? -0.05 : 0.05;
      
      flGroup.position.set(fx, 0, fz);
      fl.castShadow = true;
      sideboardGroup.add(flGroup);
    });
  } else {
    // Normal vertical feet
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12), feetMat);
    footOffsets.forEach(([fx, fz]) => {
      const fl = foot.clone();
      fl.position.set(fx, 0.06, fz);
      fl.castShadow = true;
      sideboardGroup.add(fl);
    });
  }

  const defaultSBZ = -roomD / 2 + 0.28;
  applyInteraction(sideboardGroup, selectedFurniture === 'sideboard', defaultSBZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(sideboardGroup);

  return group;
};

// 4. OFFICE BUILDER
export const buildOfficeFurniture = (
  style: DesignStyle,
  selectedFurniture: string,
  furnitureX: number,
  furnitureZ: number,
  furnitureRot: number,
  furnitureScale: number,
  roomW: number,
  roomD: number
): THREE.Group => {
  const group = new THREE.Group();

  const deskGroup = new THREE.Group();
  deskGroup.name = 'sofa_or_bed';

  const oPalette = getStylePalette(style);

  // Style-specific wood/matte materials for Office Desk Top
  const deskMat = new THREE.MeshStandardMaterial({ 
    color: oPalette.woodColor, 
    roughness: oPalette.woodRoughness || 0.6 
  });
  const drawerMat = new THREE.MeshStandardMaterial({ 
    color: oPalette.cabinetColor, 
    roughness: 0.7 
  });
  const frameMat = new THREE.MeshStandardMaterial({ 
    color: oPalette.metalColor, 
    metalness: oPalette.metalMetalness, 
    roughness: oPalette.metalRoughness 
  });
  const brassMat = new THREE.MeshStandardMaterial({ 
    color: oPalette.metalColor === 0x1a1a1a ? 0xd4af37 : oPalette.metalColor, 
    metalness: 0.9, 
    roughness: 0.15 
  });

  // 1. Desk Top plate
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.048, 0.8), deskMat);
  topMesh.position.y = 0.74;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  deskGroup.add(topMesh);

  // Soft leather desk mat / writing blotter
  const padColor = oPalette.metalColor === 0x1a1a1a ? 0x2d3238 : 0x242424;
  const padMat = new THREE.MeshStandardMaterial({ color: padColor, roughness: 0.85 });
  const deskPad = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.005, 0.46), padMat);
  deskPad.position.set(-0.05, 0.766, 0.04);
  deskPad.receiveShadow = true;
  deskGroup.add(deskPad);

  // 2. Modern desk cabinet drawer unit on left side
  const drawerUnit = new THREE.Group();
  const drawerSB = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.54, 0.72), drawerMat);
  drawerSB.position.set(0.5, 0.31, 0);
  drawerSB.castShadow = true;
  drawerUnit.add(drawerSB);

  // Elegant drawer horizontal seams & gold handles (Reoriented to face the chair/user on the negative Z side!)
  const drawerSeam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.004, 0.005), new THREE.MeshStandardMaterial({ color: 0x15100c }));
  for (let sY = 0.22; sY <= 0.52; sY += 0.18) {
    const seam = drawerSeam.clone();
    seam.position.set(0.5, sY, -0.361);
    drawerUnit.add(seam);

    const pull = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.015), brassMat);
    pull.position.set(0.5, sY + 0.08, -0.365);
    pull.castShadow = true;
    drawerUnit.add(pull);
  }
  deskGroup.add(drawerUnit);

  // Legs right side (Premium angled architectural slab or slender pipelegs depending on style)
  const legGate = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.71, 0.72), frameMat);
  legGate.position.set(-0.64, 0.355, 0);
  legGate.castShadow = true;
  deskGroup.add(legGate);

  // 3. Realistic Ergonomic Office Chair
  const chairG = new THREE.Group();
  const chairUph = new THREE.MeshStandardMaterial({ 
    color: oPalette.couchColor, 
    roughness: oPalette.couchRoughness,
    metalness: oPalette.couchMetalness || 0.0
  });

  // 5-Point functional caster base star wheels (highly detailed)
  const casterBaseCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), frameMat);
  casterBaseCenter.position.set(0, 0.05, -0.42);
  chairG.add(casterBaseCenter);

  const numProngs = 5;
  const armLen = 0.24;
  const legArmGeo = new THREE.BoxGeometry(armLen, 0.02, 0.03);
  const wheelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.6 });

  for (let i = 0; i < numProngs; i++) {
    const angle = (i / numProngs) * Math.PI * 2;
    const legArmGroup = new THREE.Group();

    const legArm = new THREE.Mesh(legArmGeo, frameMat);
    legArm.position.x = armLen / 2;
    legArmGroup.add(legArm);

    // Caster wheel at tip of prong
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(armLen, -0.025, 0);
    wheel.castShadow = true;
    legArmGroup.add(wheel);

    legArmGroup.position.set(0, 0.05, -0.42);
    legArmGroup.rotation.y = angle;
    chairG.add(legArmGroup);
  }

  // Hydraulic cylinder strut
  const hydraulic = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 10), frameMat);
  hydraulic.position.set(0, 0.21, -0.42);
  chairG.add(hydraulic);

  // Curved ergonomic seat cushion
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.46), chairUph);
  cushion.position.set(0, 0.41, -0.42);
  cushion.castShadow = true;
  chairG.add(cushion);

  // Contoured breathable mesh backrest
  const meshBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.04), chairUph);
  meshBack.position.set(0, 0.65, -0.62);
  meshBack.rotation.x = -0.05;
  meshBack.castShadow = true;
  chairG.add(meshBack);

  // Modern curved steel armrests
  const armrestL = new THREE.Group();
  const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), frameMat);
  armPost.position.set(-0.24, 0.51, -0.42);
  armPost.castShadow = true;
  armrestL.add(armPost);

  const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.28), wheelMat);
  armPad.position.set(-0.24, 0.59, -0.38);
  armPad.castShadow = true;
  armrestL.add(armPad);
  chairG.add(armrestL);

  const armrestR = armrestL.clone();
  // Mirror to the right side
  armrestR.children.forEach(c => {
    c.position.x = 0.24;
  });
  chairG.add(armrestR);

  deskGroup.add(chairG);

  // 4. Laptop on desk (Reoriented to face the chair at -0.42 Z)
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.85, roughness: 0.2 });
  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.20), silverMat);
  laptopBase.position.set(-0.05, 0.771, -0.04); // Closer to chair
  laptopBase.castShadow = true;
  deskGroup.add(laptopBase);

  // Dark matte keyboard keys block
  const darkKeysMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.8 });
  const keyboardKeys = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.002, 0.09), darkKeysMat);
  keyboardKeys.position.set(-0.05, 0.777, -0.02); // Centered towards the hinge
  keyboardKeys.receiveShadow = true;
  deskGroup.add(keyboardKeys);

  // Sleek glass trackpad
  const trackpadMat = new THREE.MeshStandardMaterial({ color: 0x444448, roughness: 0.4, metalness: 0.1 });
  const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.04), trackpadMat);
  trackpad.position.set(-0.05, 0.777, -0.09); // Near palm edge
  trackpad.receiveShadow = true;
  deskGroup.add(trackpad);

  // Screen housing slanted backwards (tilt towards positive Z further from user)
  const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.20, 0.008), silverMat);
  laptopScreen.position.set(-0.05, 0.86, 0.06); // Further back from user
  laptopScreen.rotation.x = -0.24; // slanted back
  laptopScreen.castShadow = true;
  deskGroup.add(laptopScreen);

  // Glowing blue screen face facing the user
  const screenGlowingMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.002),
    new THREE.MeshBasicMaterial({ color: 0x88bbff })
  );
  screenGlowingMesh.position.set(-0.05, 0.86, 0.055); // Slightly on user side of screen housing
  screenGlowingMesh.rotation.x = -0.24;
  deskGroup.add(screenGlowingMesh);

  // 5. Office Desk Accessories (Naturally oriented to user)
  // Ceramic coffee mug (Cylinder + thin handle ring placed on right, facing user)
  const mugBaseGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.08, 12);
  const mugMat = new THREE.MeshStandardMaterial({ color: 0xdd4b39, roughness: 0.15 }); // bold red ceramic mug
  const mug = new THREE.Mesh(mugBaseGeo, mugMat);
  mug.position.set(0.32, 0.801, 0.08); // Re-positioned near hand reach
  mug.castShadow = true;
  deskGroup.add(mug);

  const handleGeo = new THREE.TorusGeometry(0.024, 0.006, 8, 16);
  const mugHandle = new THREE.Mesh(handleGeo, mugMat);
  mugHandle.position.set(0.295, 0.801, 0.054); // facing southwest towards hand
  mugHandle.rotation.y = Math.PI / 4;
  deskGroup.add(mugHandle);

  // Modern pen/pencil container cup with pencils inside
  const cupMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.82, roughness: 0.2 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.088, 12), cupMat);
  cup.position.set(-0.5, 0.804, -0.12);
  cup.castShadow = true;
  deskGroup.add(cup);

  const pencilGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.11, 6);
  const pencilMatY = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.5 }); // yellow pencil
  const pencil1 = new THREE.Mesh(pencilGeo, pencilMatY);
  pencil1.position.set(-0.51, 0.85, -0.11);
  pencil1.rotation.set(0.15, 0.0, 0.08);
  deskGroup.add(pencil1);

  const pencilMatBl = new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.7 }); // blue pen
  const pencil2 = new THREE.Mesh(pencilGeo, pencilMatBl);
  pencil2.position.set(-0.49, 0.85, -0.13);
  pencil2.rotation.set(-0.12, 0.0, -0.14);
  deskGroup.add(pencil2);

  // Bankers lamp/Desk light - beautifully structured & proportioned so it's style mapped and elegant
  let shadeColor = 0x1a431c; // standard forest green bankers lamp
  if (style === DesignStyle.MINIMALIST || style === DesignStyle.JAPANDI || style === DesignStyle.SCANDINAVIAN) {
    shadeColor = 0xefedd6; // modern white/cream frosted glass
  } else if (style === DesignStyle.LUXURY) {
    shadeColor = 0x0c1b12; // royal obsidian deep emerald green
  } else if (style === DesignStyle.INDUSTRIAL || style === DesignStyle.MODERN) {
    shadeColor = 0x222225; // dark graphite frosted metal shade
  }
  const greenShade = new THREE.MeshStandardMaterial({ color: shadeColor, roughness: 0.25 });
  const goldAccentMat = new THREE.MeshStandardMaterial({ 
    color: oPalette.metalColor === 0x1a1a1a ? 0xd4af37 : oPalette.metalColor, 
    metalness: 0.9, 
    roughness: 0.15 
  });
  
  // Base
  const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.016, 16), goldAccentMat);
  lBase.position.set(-0.55, 0.75, 0.15);
  lBase.castShadow = true;
  deskGroup.add(lBase);

  // Vertical pole
  const lPole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 12), frameMat);
  lPole.position.set(-0.55, 0.89, 0.15);
  lPole.castShadow = true;
  deskGroup.add(lPole);

  // Curved upper neck joint / horizontal arm pointing towards the mousepad / chair
  const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), goldAccentMat);
  lArm.rotation.z = Math.PI / 2; // make it horizontal
  lArm.position.set(-0.49, 1.03, 0.15); // bridges from -0.55 to -0.43
  lArm.castShadow = true;
  deskGroup.add(lArm);

  // Beautiful flared cylindrical glass shade suspended straight downwards, avoiding any slanted crookedness
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.078, 0.082, 16), greenShade);
  shade.position.set(-0.43, 0.98, 0.15); // sits beautifully at the end of the arm
  shade.rotation.set(0, 0, 0); // straight downward, absolutely no weird tilt!
  shade.castShadow = true;
  deskGroup.add(shade);

  // Small internal glowing bulb mesh
  const lBulb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffeebb }));
  lBulb.position.set(-0.43, 0.95, 0.15);
  deskGroup.add(lBulb);

  const defaultDeskZ = 0.32;
  applyInteraction(deskGroup, selectedFurniture === 'sofa_or_bed', defaultDeskZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(deskGroup);

  // Modular tall bookcase shelves (gorgeous open framing with real depth and shadows)
  const bookcaseGroup = new THREE.Group();
  bookcaseGroup.name = 'bookcase';

  // Wood backing material and frame materials (matching style palette or warm oak/walnut)
  const palette = getStylePalette(style);
  const woodBC = new THREE.MeshStandardMaterial({ color: palette.woodColor, roughness: palette.woodRoughness });
  const backPanelBC = new THREE.MeshStandardMaterial({ color: Math.max(0, palette.woodColor - 0x111111), roughness: Math.min(1, palette.woodRoughness + 0.1) });

  // 1. Thin backing board at the absolute rear
  const backboard = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.76, 0.015), backPanelBC);
  backboard.position.set(0, 0.9, -0.15);
  backboard.receiveShadow = true;
  bookcaseGroup.add(backboard);

  // 2. Heavy outer sides and frame rims
  const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 0.32), woodBC);
  leftSide.position.set(-1.08, 0.9, 0);
  leftSide.castShadow = true;
  leftSide.receiveShadow = true;
  bookcaseGroup.add(leftSide);

  const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 0.32), woodBC);
  rightSide.position.set(1.08, 0.9, 0);
  rightSide.castShadow = true;
  rightSide.receiveShadow = true;
  bookcaseGroup.add(rightSide);

  const topCover = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.32), woodBC);
  topCover.position.set(0, 1.78, 0);
  topCover.castShadow = true;
  topCover.receiveShadow = true;
  bookcaseGroup.add(topCover);

  const bottomPlinth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.32), woodBC);
  bottomPlinth.position.set(0, 0.03, 0);
  bottomPlinth.castShadow = true;
  bottomPlinth.receiveShadow = true;
  bookcaseGroup.add(bottomPlinth);

  // 3. Two elegant vertical support partition dividers to organize the cabinet into three distinct columns
  const dividerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.024, 1.71, 0.30), woodBC);
  dividerLeft.position.set(-0.36, 0.885, -0.01);
  dividerLeft.castShadow = true;
  dividerLeft.receiveShadow = true;
  bookcaseGroup.add(dividerLeft);

  const dividerRight = dividerLeft.clone();
  dividerRight.position.x = 0.36;
  bookcaseGroup.add(dividerRight);

  // 4. Horizontal storage shelves distributed across columns
  const shelfHeights = [0.44, 0.88, 1.32];
  const shelfLeftGeo = new THREE.BoxGeometry(0.68, 0.02, 0.30);
  shelfHeights.forEach(shY => {
    const sL = new THREE.Mesh(shelfLeftGeo, woodBC);
    sL.position.set(-0.72, shY, -0.01);
    sL.castShadow = true;
    sL.receiveShadow = true;
    bookcaseGroup.add(sL);

    const sC = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.02, 0.30), woodBC);
    sC.position.set(0, shY, -0.01);
    sC.castShadow = true;
    sC.receiveShadow = true;
    bookcaseGroup.add(sC);

    const sR = new THREE.Mesh(shelfLeftGeo, woodBC);
    sR.position.set(0.72, shY, -0.01);
    sR.castShadow = true;
    sR.receiveShadow = true;
    bookcaseGroup.add(sR);
  });

  // 5. Fill each beautiful cubby pocket with realistic standing, leaning books, and luxury decor ornaments deterministically!
  let seed = 42;
  const nextRand = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const bColors = [0x993d3d, 0x415b76, 0x436b5c, 0xc29944, 0x5a514d, 0xe0dbd3, 0x1f1f1f];

  const addBookPile = (colX: number, shelfY: number, count: number, startOffset: number) => {
    let currentX = colX + startOffset;
    for (let i = 0; i < count; i++) {
      const bookH = 0.16 + nextRand() * 0.05;
      const bookW = 0.024;
      const bookD = 0.15 + nextRand() * 0.04;
      const bColor = bColors[Math.floor(nextRand() * bColors.length)];

      const bookMesh = new THREE.Mesh(
        new THREE.BoxGeometry(bookW, bookH, bookD),
        new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.8, metalness: 0.1 })
      );
      bookMesh.position.set(currentX, shelfY + (bookH / 2) + 0.01, -0.02);
      bookMesh.castShadow = true;
      bookMesh.receiveShadow = true;
      bookcaseGroup.add(bookMesh);
      currentX += 0.028;
    }
  };

  const addLeaningBook = (colX: number, shelfY: number, angle: number) => {
    const bookH = 0.20;
    const bookW = 0.024;
    const bookD = 0.16;
    const bookMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bookW, bookH, bookD),
      new THREE.MeshStandardMaterial({ color: bColors[1], roughness: 0.85 })
    );
    bookMesh.position.set(colX, shelfY + 0.09, -0.02);
    bookMesh.rotation.z = angle;
    bookMesh.castShadow = true;
    bookcaseGroup.add(bookMesh);
  };

  const addSculpture = (colX: number, shelfY: number) => {
    const brassDecorMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.15 });
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 8, 24), brassDecorMat);
    tor.position.set(colX, shelfY + 0.065, -0.02);
    tor.rotation.set(nextRand() * Math.PI, nextRand() * Math.PI, 0);
    tor.castShadow = true;
    bookcaseGroup.add(tor);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.015, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
    base.position.set(colX, shelfY + 0.007, -0.02);
    base.castShadow = true;
    bookcaseGroup.add(base);
  };

  const addSmallPlant = (colX: number, shelfY: number) => {
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf9f9fa, roughness: 0.3 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4c6e43, roughness: 0.8 });

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.046, 12), ceramicMat);
    pot.position.set(colX, shelfY + 0.023, -0.02);
    pot.castShadow = true;
    bookcaseGroup.add(pot);

    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.076), leafMat);
      leaf.position.set(colX + (nextRand() - 0.5) * 0.025, shelfY + 0.046, -0.02 + (nextRand() - 0.5) * 0.025);
      leaf.rotation.set((nextRand() - 0.5) * 0.5, (nextRand() * Math.PI), (nextRand() - 0.5) * 0.5);
      leaf.castShadow = true;
      bookcaseGroup.add(leaf);
    }
  };

  // Populate cubbies
  // Height 0.06
  addBookPile(-0.72, 0.06, 6, -0.15);
  addBookPile(0, 0.06, 8, -0.2);
  addBookPile(0.72, 0.06, 5, -0.1);

  // Height 0.44
  addBookPile(-0.72, 0.44, 4, -0.12);
  addSmallPlant(0, 0.44);
  addBookPile(0.72, 0.44, 6, -0.18);
  addLeaningBook(0.72 + 0.12, 0.44, -0.32);

  // Height 0.88
  addSculpture(-0.72, 0.88);
  addBookPile(0, 0.88, 5, -0.1);
  addLeaningBook(-0.16, 0.88, 0.3);
  addBookPile(0.72, 0.88, 4, -0.08);

  // Height 1.32
  addBookPile(-0.72, 1.32, 5, -0.16);
  addSculpture(0, 1.32);
  addSmallPlant(0.72, 1.32);

  const defaultBCZ = -roomD / 2 + 0.22;
  applyInteraction(bookcaseGroup, selectedFurniture === 'bookcase', defaultBCZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(bookcaseGroup);

  return group;
};

// 5. BATHROOM BUILDER
export const buildBathroomFurniture = (
  style: DesignStyle,
  selectedFurniture: string,
  furnitureX: number,
  furnitureZ: number,
  furnitureRot: number,
  furnitureScale: number,
  roomW: number,
  roomD: number
): THREE.Group => {
  const group = new THREE.Group();

  const bathtubGroup = new THREE.Group();
  bathtubGroup.name = 'sofa_or_bed';

  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.15 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x7ebcdc, roughness: 0.02, transparent: true, opacity: 0.5 });
  const chromeMat = getFaucetChromeMaterial();

  // Egg freestanding bathtub capsule shape
  const tubGeo = new THREE.CylinderGeometry(0.42, 0.38, 0.55, 24);
  tubGeo.scale(1.9, 1.0, 1.0); // stretch X
  const tub = new THREE.Mesh(tubGeo, ceramicMat);
  tub.position.y = 0.275;
  tub.castShadow = true;
  bathtubGroup.add(tub);

  const waterGeo = new THREE.CylinderGeometry(0.40, 0.37, 0.02, 24);
  waterGeo.scale(1.82, 1.0, 1.0);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.49;
  bathtubGroup.add(water);

  // Chrome filler standing tap
  const tapBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), chromeMat);
  tapBase.position.set(0.85, 0.02, 0);
  bathtubGroup.add(tapBase);

  const tapPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.80, 12), chromeMat);
  tapPipe.position.set(0.85, 0.44, 0);
  tapPipe.castShadow = true;
  bathtubGroup.add(tapPipe);

  const tapArch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.032, 0.032), chromeMat);
  tapArch.position.set(0.76, 0.84, 0);
  tapArch.castShadow = true;
  bathtubGroup.add(tapArch);

  const tapSpoutDown = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 12), chromeMat);
  tapSpoutDown.position.set(0.67, 0.81, 0);
  tapSpoutDown.castShadow = true;
  bathtubGroup.add(tapSpoutDown);

  const tapHandle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.08), chromeMat);
  tapHandle.position.set(0.85, 0.65, 0.06);
  tapHandle.rotation.x = Math.PI / 4;
  tapHandle.castShadow = true;
  bathtubGroup.add(tapHandle);

  const defaultTubX = -roomW / 2 + 1.1;
  const defaultTubZ = 0.32;
  applyInteraction(bathtubGroup, selectedFurniture === 'sofa_or_bed', defaultTubZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, 0, defaultTubX);
  group.add(bathtubGroup);

  // Double vanity basin dresser
  const vanityGroup = new THREE.Group();
  vanityGroup.name = 'vanity';

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.1 });
  const drawerMat = new THREE.MeshStandardMaterial({ color: 0x7c614b, roughness: 0.6 });

  const vanityBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.44, 0.48), stoneMat);
  vanityBody.position.y = 0.58;
  vanityBody.castShadow = true;
  vanityBody.receiveShadow = true;
  vanityGroup.add(vanityBody);

  const drawers = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.26, 0.44), drawerMat);
  drawers.position.set(0, 0.28, 0.01);
  vanityGroup.add(drawers);

  // Sink bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.12, 16), ceramicMat);
  bowl.position.set(0, 0.82, 0.02);
  bowl.castShadow = true;
  vanityGroup.add(bowl);

  // High-fidelity chrome gooseneck faucet for vanity sink basin
  const vFaucetBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 12), chromeMat);
  vFaucetBase.position.set(0, 0.86, -0.16);
  vFaucetBase.castShadow = true;
  vanityGroup.add(vFaucetBase);

  const vFaucetPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 12), chromeMat);
  vFaucetPillar.position.set(0, 0.97, -0.16);
  vFaucetPillar.castShadow = true;
  vanityGroup.add(vFaucetPillar);

  const vFaucetArch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.024, 0.024), chromeMat);
  vFaucetArch.position.set(0, 1.08, -0.11);
  vFaucetArch.castShadow = true;
  vanityGroup.add(vFaucetArch);

  const vFaucetHead = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12), chromeMat);
  vFaucetHead.position.set(0, 1.06, -0.06);
  vFaucetHead.castShadow = true;
  vanityGroup.add(vFaucetHead);

  const vFaucetLever = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.05), chromeMat);
  vFaucetLever.position.set(0.03, 0.90, -0.16);
  vFaucetLever.rotation.x = Math.PI / 4;
  vFaucetLever.castShadow = true;
  vanityGroup.add(vFaucetLever);

  // LED Round Backlit mirror on back wall
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.98, roughness: 0.02 });
  const ledGlow = new THREE.MeshBasicMaterial({ color: 0xffedd5 });

  const backdropRing = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.02, 32), ledGlow);
  backdropRing.rotateX(Math.PI / 2);
  backdropRing.position.set(0, 1.48, -0.22);
  vanityGroup.add(backdropRing);

  const primaryMirror = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.01, 32), mirrorMat);
  primaryMirror.rotateX(Math.PI / 2);
  primaryMirror.position.set(0, 1.48, -0.205);
  primaryMirror.castShadow = true;
  vanityGroup.add(primaryMirror);

  const defaultVanityZ = -roomD / 2 + 0.32;
  applyInteraction(vanityGroup, selectedFurniture === 'vanity', defaultVanityZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, 0, 0.4);
  group.add(vanityGroup);

  // Back wall smart toilet
  const toiletGroup = new THREE.Group();
  toiletGroup.name = 'toilet';

  // Smart toilet back wall tank housing/base module (sleek & geometric)
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.55, 0.16), ceramicMat);
  backPanel.position.set(0, 0.275, -0.18);
  backPanel.castShadow = true;
  toiletGroup.add(backPanel);

  // Elongated streamlined bowl base
  const toiletBowlGeo = new THREE.CylinderGeometry(0.20, 0.17, 0.38, 24);
  const toiletBowl = new THREE.Mesh(toiletBowlGeo, ceramicMat);
  toiletBowl.position.set(0, 0.19, 0.08);
  toiletBowl.scale.set(1.0, 1.0, 1.25); // ergonomic elongated oval profiling
  toiletBowl.castShadow = true;
  toiletGroup.add(toiletBowl);

  // Sleek low-profile smart lid
  const seatLidGeo = new THREE.CylinderGeometry(0.202, 0.202, 0.03, 24);
  const seatLid = new THREE.Mesh(seatLidGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }));
  seatLid.position.set(0, 0.395, 0.06);
  seatLid.scale.set(1.0, 1.0, 1.25);
  seatLid.castShadow = true;
  toiletGroup.add(seatLid);

  // Accent circular silver smart flush sensor button on the wall panel
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
  const flushButton = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.01, 16), buttonMat);
  flushButton.rotation.x = Math.PI / 2;
  flushButton.position.set(0.12, 0.44, -0.095);
  toiletGroup.add(flushButton);

  // Modern smart subtle blue ambient indicator nightlight glow bar
  const nightlightGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.01, 0.005),
    new THREE.MeshBasicMaterial({ color: 0x4488ff })
  );
  nightlightGlow.position.set(0, 0.41, -0.098);
  toiletGroup.add(nightlightGlow);

  const defaultToiletX = roomW / 2 - 0.65;
  const defaultToiletZ = -roomD / 2 + 0.25;
  applyInteraction(toiletGroup, selectedFurniture === 'toilet', defaultToiletZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, 0, defaultToiletX);
  group.add(toiletGroup);

  return group;
};

// 6. KITCHEN BUILDER
export const buildKitchenFurniture = (
  style: DesignStyle,
  selectedFurniture: string,
  furnitureX: number,
  furnitureZ: number,
  furnitureRot: number,
  furnitureScale: number,
  roomW: number,
  roomD: number
): THREE.Group => {
  const group = new THREE.Group();

  const cabinetGroup = new THREE.Group();
  cabinetGroup.name = 'sofa_or_bed';

  const palette = getStylePalette(style);

  const counterBaseMat = new THREE.MeshStandardMaterial({
    color: palette.cabinetColor,
    roughness: 0.6
  });
  const slabQuartzMat = new THREE.MeshStandardMaterial({
    color: palette.countertopColor,
    roughness: palette.countertopRoughness,
    metalness: palette.countertopMetalness
  });
  const blackGlassMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.08 });
  const stainlessSteelMat = new THREE.MeshStandardMaterial({
    color: palette.metalColor,
    metalness: palette.metalMetalness > 0.9 ? 0.92 : 0.85,
    roughness: palette.metalRoughness
  });

  const silverMetalMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.98,
    roughness: 0.08
  });

  const sinkMetalMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.95,
    roughness: 0.15
  });

  // Main Counter cabinetry line (3m length)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.85, 0.64), counterBaseMat);
  counter.position.y = 0.425;
  counter.castShadow = true;
  counter.receiveShadow = true;
  cabinetGroup.add(counter);

  const slabTop = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.05, 0.66), slabQuartzMat);
  slabTop.position.y = 0.875;
  slabTop.castShadow = true;
  cabinetGroup.add(slabTop);

  // 1. Black/Metallic Cooktop Frame & Glass
  const cooktopBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.015, 0.44), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.3 }));
  cooktopBase.position.set(-0.6, 0.905, 0);
  cooktopBase.castShadow = true;
  cabinetGroup.add(cooktopBase);

  const hobGlass = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.005, 0.40), blackGlassMat);
  hobGlass.position.set(-0.6, 0.915, 0);
  cabinetGroup.add(hobGlass);

  // Active gas burner rings (Cast Iron Grates & Burners)
  const castIronMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.2 });
  const copperBurnerMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: 0.8, roughness: 0.4 }); // Brass/copper center elements

  // Left Burner
  const burnerRimL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.015, 16), silverMetalMat);
  burnerRimL.position.set(-0.76, 0.916, 0);
  cabinetGroup.add(burnerRimL);

  const burnerBaseL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), castIronMat);
  burnerBaseL.position.set(-0.76, 0.92, 0);
  burnerBaseL.castShadow = true;
  cabinetGroup.add(burnerBaseL);

  const burnerCoreL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16), copperBurnerMat);
  burnerCoreL.position.set(-0.76, 0.922, 0);
  cabinetGroup.add(burnerCoreL);

  // Left burner crossed support grates
  const grateBarL1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.02), castIronMat);
  grateBarL1.position.set(-0.76, 0.93, 0);
  cabinetGroup.add(grateBarL1);

  const grateBarL2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.22), castIronMat);
  grateBarL2.position.set(-0.76, 0.93, 0);
  cabinetGroup.add(grateBarL2);

  // Right Burner
  const burnerRimR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.015, 16), silverMetalMat);
  burnerRimR.position.set(-0.44, 0.916, 0);
  cabinetGroup.add(burnerRimR);

  const burnerBaseR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), castIronMat);
  burnerBaseR.position.set(-0.44, 0.92, 0);
  burnerBaseR.castShadow = true;
  cabinetGroup.add(burnerBaseR);

  const burnerCoreR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16), copperBurnerMat);
  burnerCoreR.position.set(-0.44, 0.922, 0);
  cabinetGroup.add(burnerCoreR);

  // Right burner crossed support grates
  const grateBarR1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.02), castIronMat);
  grateBarR1.position.set(-0.44, 0.93, 0);
  cabinetGroup.add(grateBarR1);

  const grateBarR2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.22), castIronMat);
  grateBarR2.position.set(-0.44, 0.93, 0);
  cabinetGroup.add(grateBarR2);

  // 4 circular cooktop control knobs on front center rim of stove
  for (let k = 0; k < 4; k++) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.015, 8), silverMetalMat);
    knob.position.set(-0.68 + k * 0.05, 0.915, 0.185);
    knob.rotation.x = Math.PI / 2;
    cabinetGroup.add(knob);
  }

  // 2. High-Fidelity 3D Recessed Sink Basin
  const sinkRim = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.015, 0.44), silverMetalMat);
  sinkRim.position.set(0.6, 0.905, 0);
  sinkRim.name = 'sink_rim';
  sinkRim.castShadow = true;
  cabinetGroup.add(sinkRim);

  const sinkInnerBasin = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.01, 0.36), sinkMetalMat);
  sinkInnerBasin.position.set(0.6, 0.898, 0);
  cabinetGroup.add(sinkInnerBasin);

  const drainPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.005, 12), silverMetalMat);
  drainPlate.position.set(0.6, 0.90, 0);
  cabinetGroup.add(drainPlate);

  const drainHole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.007, 12), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  drainHole.position.set(0.6, 0.901, 0);
  cabinetGroup.add(drainHole);

  // 3. Elegant Proportioned Gooseneck Faucet
  const faucetChromeMat = getFaucetChromeMaterial();
  const faucetBaseObj = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 12), faucetChromeMat);
  faucetBaseObj.position.set(0.6, 0.93, -0.18);
  faucetBaseObj.castShadow = true;
  cabinetGroup.add(faucetBaseObj);

  // Main high neck pillar
  const faucetPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 12), faucetChromeMat);
  faucetPillar.position.set(0.6, 1.07, -0.18);
  faucetPillar.castShadow = true;
  cabinetGroup.add(faucetPillar);

  // Curved gooseneck horizontal arch section
  const faucetArch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.028, 0.028), faucetChromeMat);
  faucetArch.position.set(0.6, 1.21, -0.11);
  faucetArch.castShadow = true;
  cabinetGroup.add(faucetArch);

  // Turned down spout head
  const faucetHead = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 12), faucetChromeMat);
  faucetHead.position.set(0.6, 1.18, -0.04);
  faucetHead.castShadow = true;
  cabinetGroup.add(faucetHead);

  // Single handle control lever on side
  const faucetLever = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.07), faucetChromeMat);
  faucetLever.position.set(0.65, 0.96, -0.18);
  faucetLever.rotation.x = Math.PI / 4;
  faucetLever.castShadow = true;
  cabinetGroup.add(faucetLever);

  // Upper hanging shelf cupboards
  const upperMat = new THREE.MeshStandardMaterial({
    color: palette.woodColor,
    roughness: palette.woodRoughness
  });
  const wallCab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.65, 0.35), upperMat);
  wallCab.position.set(-0.35, 1.85, -0.155);
  wallCab.castShadow = true;
  cabinetGroup.add(wallCab);

  // Range exhaust chimney hood extractor
  const rangeMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, metalness: 0.8, roughness: 0.4 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.95), rangeMat);
  pipe.position.set(-0.6, 1.65, -0.1);
  pipe.castShadow = true;
  cabinetGroup.add(pipe);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.52), rangeMat);
  hood.position.set(-0.6, 1.15, -0.05);
  cabinetGroup.add(hood);

  const defaultCabZ = -roomD / 2 + 0.33;
  applyInteraction(cabinetGroup, selectedFurniture === 'sofa_or_bed', defaultCabZ, furnitureX, furnitureZ, furnitureRot, furnitureScale);
  group.add(cabinetGroup);

  // Smart metallic refrigerator redone as French-Door Refrigerator!
  const fridgeGroup = new THREE.Group();
  fridgeGroup.name = 'fridge';

  // Customize refrigerator color scheme based on user selected interior design style (no heavy black defaults!)
  let fridgeBodyColor = 0x1d1e20;
  let fridgeDoorColor = 0x3d3e42;
  let bodyMetalness = 0.8;
  let bodyRoughness = 0.35;
  let doorMetalness = 0.9;
  let doorRoughness = 0.18;
  let handleColor = 0xeeeeee;

  switch (style) {
    case DesignStyle.MODERN:
    case DesignStyle.MINIMALIST:
      // Minimalist polar white glass look
      fridgeBodyColor = 0xebeff2;
      fridgeDoorColor = 0xfcfcfd;
      bodyMetalness = 0.2;
      bodyRoughness = 0.3;
      doorMetalness = 0.1;
      doorRoughness = 0.08; // highly polished high-tech glossy surface
      handleColor = 0x222222;
      break;
    case DesignStyle.SCANDINAVIAN:
    case DesignStyle.JAPANDI:
      // Calming vanilla milk / oat cream tone
      fridgeBodyColor = 0xe4d9c7;
      fridgeDoorColor = 0xf4eee2;
      bodyMetalness = 0.15;
      bodyRoughness = 0.5;
      doorMetalness = 0.05;
      doorRoughness = 0.35;
      handleColor = 0x8a725b; // warm earthy handle
      break;
    case DesignStyle.MID_CENTURY_MODERN:
      // retro sunset robin-egg pastel mint/turquoise
      fridgeBodyColor = 0x76bba5;
      fridgeDoorColor = 0xa3decb;
      bodyMetalness = 0.4;
      bodyRoughness = 0.25;
      doorMetalness = 0.3;
      doorRoughness = 0.15;
      handleColor = 0xd4af37; // Warm brass details
      break;
    case DesignStyle.INDUSTRIAL:
      // Classic professional chef gunmetal brushed stainless steel
      fridgeBodyColor = 0x2a2c30;
      fridgeDoorColor = 0x6e727a;
      bodyMetalness = 0.95;
      bodyRoughness = 0.2;
      doorMetalness = 0.95;
      doorRoughness = 0.18;
      handleColor = 0xdddddd;
      break;
    case DesignStyle.LUXURY:
      // Ultra-premium warm champagne rose gold
      fridgeBodyColor = 0x7a6c5d;
      fridgeDoorColor = 0xd6c4b2;
      bodyMetalness = 0.85;
      bodyRoughness = 0.18;
      doorMetalness = 0.9;
      doorRoughness = 0.12;
      handleColor = 0xffdfa9; // high shine pristine brass/gold handles
      break;
    case DesignStyle.BOHEMIAN:
      // Terracotta sun-baked matte red
      fridgeBodyColor = 0x8f4c38;
      fridgeDoorColor = 0xbe735c;
      bodyMetalness = 0.05;
      bodyRoughness = 0.75;
      doorMetalness = 0.05;
      doorRoughness = 0.7;
      handleColor = 0xd4af37;
      break;
    case DesignStyle.COASTAL:
      // Breeze blue sand satin tone
      fridgeBodyColor = 0xdfe4ec;
      fridgeDoorColor = 0xb4c7d6;
      bodyMetalness = 0.3;
      bodyRoughness = 0.35;
      doorMetalness = 0.2;
      doorRoughness = 0.25;
      handleColor = 0xffffff;
      break;
    default:
      // Modern slate grey (not too heavy black)
      fridgeBodyColor = 0x202123;
      fridgeDoorColor = 0x48494d;
      bodyMetalness = 0.8;
      bodyRoughness = 0.35;
      doorMetalness = 0.9;
      doorRoughness = 0.18;
      handleColor = 0xeeeeee;
      break;
  }

  const bodyMat = new THREE.MeshStandardMaterial({ color: fridgeBodyColor, metalness: bodyMetalness, roughness: bodyRoughness }); // side walls / core chassis
  const steelMat = new THREE.MeshStandardMaterial({ color: fridgeDoorColor, metalness: doorMetalness, roughness: doorRoughness }); // door panels stainless steel
  const chromeMat = new THREE.MeshStandardMaterial({ color: handleColor, metalness: 0.95, roughness: 0.05 }); // handles, faucet
  const darkGlassUIMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 }); // glass UI borders / dispenser cavity
  
  // Custom glowing lights
  const dispenserGlowMat = new THREE.MeshBasicMaterial({ color: 0x88ccff }); // light-blue glow
  const screenGlowMat = new THREE.MeshBasicMaterial({ color: 0x3ac5f5 }); // digital panel cyan glow

  // 1. Back/Side Chassis - core box (0.88 wide, 1.83 high, 0.68 deep)
  const fridgeChassis = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.83, 0.68), bodyMat);
  fridgeChassis.position.set(0, 0.915, -0.01);
  fridgeChassis.castShadow = true;
  fridgeChassis.receiveShadow = true;
  fridgeGroup.add(fridgeChassis);

  // 2. Freezer Bottom Drawer (lower 40% height, from 0 to 0.63)
  const freezerDoor = new THREE.Mesh(new THREE.BoxGeometry(0.89, 0.61, 0.03), steelMat);
  freezerDoor.position.set(0, 0.315, 0.345);
  freezerDoor.castShadow = true;
  fridgeGroup.add(freezerDoor);

  // Wide horizontal heavy handle bar for the freezer drawer
  const handFreezer = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.024, 0.02), chromeMat);
  handFreezer.position.set(0, 0.52, 0.365);
  handFreezer.castShadow = true;
  fridgeGroup.add(handFreezer);

  // 3. Upper French doors (Left and Right swing doors)
  // Each door is 0.442 wide, 1.13 high, 0.03 deep, with 0.006 gap between them
  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.442, 1.13, 0.03), steelMat);
  leftDoor.position.set(-0.224, 1.22, 0.345);
  leftDoor.castShadow = true;
  fridgeGroup.add(leftDoor);

  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.442, 1.13, 0.03), steelMat);
  rightDoor.position.set(0.224, 1.22, 0.345);
  rightDoor.castShadow = true;
  fridgeGroup.add(rightDoor);

  // Vertical slim handles for left/right doors
  const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.75, 0.02), chromeMat);
  handleL.position.set(-0.035, 1.15, 0.365);
  handleL.castShadow = true;
  fridgeGroup.add(handleL);

  const handleR = handleL.clone();
  handleR.position.x = 0.035;
  fridgeGroup.add(handleR);

  // 4. Smart Dispenser Panel recessed on Left Door
  const dispenserOuter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.005), darkGlassUIMat);
  dispenserOuter.position.set(-0.224, 1.34, 0.361);
  fridgeGroup.add(dispenserOuter);

  const dispenserNiche = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.015), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
  dispenserNiche.position.set(-0.224, 1.31, 0.363);
  fridgeGroup.add(dispenserNiche);

  // Spout and indicator dot light
  const spoutWater = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.025), chromeMat);
  spoutWater.position.set(-0.224, 1.37, 0.363);
  fridgeGroup.add(spoutWater);

  const dispenserLight = new THREE.Mesh(new THREE.SphereGeometry(0.005), dispenserGlowMat);
  dispenserLight.position.set(-0.224, 1.38, 0.371);
  fridgeGroup.add(dispenserLight);

  // 5. Smart Digital Screen / Control Panel on Right Door
  const screenPad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.005), darkGlassUIMat);
  screenPad.position.set(0.224, 1.34, 0.361);
  fridgeGroup.add(screenPad);

  // Interactive colorful graphics glow line
  const screenFace = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.002), screenGlowMat);
  screenFace.position.set(0.224, 1.34, 0.364);
  fridgeGroup.add(screenFace);

  // White inner detail/UI overlay
  const screenUI = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.01, 0.001), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  screenUI.position.set(0.224, 1.44, 0.366);
  fridgeGroup.add(screenUI);

  const screenUI2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.004, 0.001), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  screenUI2.position.set(0.224, 1.41, 0.366);
  fridgeGroup.add(screenUI2);

  const screenUI3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.001), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  screenUI3.position.set(0.224, 1.38, 0.366);
  fridgeGroup.add(screenUI3);

  const defaultFridgeX = roomW / 2 - 0.48;
  const defaultFridgeZ = -0.3;
  applyInteraction(fridgeGroup, selectedFurniture === 'fridge', defaultFridgeZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, -Math.PI / 2, defaultFridgeX);
  group.add(fridgeGroup);

  return group;
};

// 7. STUDIO BUILDER
export const buildStudioFurniture = (
  style: DesignStyle,
  selectedFurniture: string,
  furnitureX: number,
  furnitureZ: number,
  furnitureRot: number,
  furnitureScale: number,
  roomW: number,
  roomD: number,
  bedType: 'double' | 'single' = 'single'
): THREE.Group => {
  const group = new THREE.Group();

  // Cozy Single/Double Bed (No screens or unnecessary partitions)
  const bedGroup = new THREE.Group();
  bedGroup.name = 'sofa_or_bed';

  const woodBedMat = new THREE.MeshStandardMaterial({ color: 0x76533c, roughness: 0.5 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.95 });

  const isDouble = bedType === 'double';
  const width = isDouble ? 1.95 : 1.35;
  const mattWidth = isDouble ? 1.88 : 1.28;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, 1.95), woodBedMat);
  frame.position.y = 0.15;
  frame.castShadow = true;
  frame.receiveShadow = true;
  bedGroup.add(frame);

  const mattress = new THREE.Mesh(new THREE.BoxGeometry(mattWidth, 0.26, 1.88), mattressMat);
  mattress.position.set(0, 0.28, 0.025);
  mattress.castShadow = true;
  bedGroup.add(mattress);

  if (isDouble) {
    const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.45), mattressMat);
    pillowL.position.set(-0.43, 0.44, -0.68);
    pillowL.rotation.x = Math.PI / 16;
    pillowL.castShadow = true;
    bedGroup.add(pillowL);

    const pillowR = pillowL.clone();
    pillowR.position.x = 0.43;
    bedGroup.add(pillowR);
  } else {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.45), mattressMat);
    pillow.position.set(0, 0.44, -0.68);
    pillow.rotation.x = Math.PI / 16;
    pillow.castShadow = true;
    bedGroup.add(pillow);
  }

  const defaultBedX = -roomW / 2 + 1.15;
  const defaultBedZ = -roomD / 2 + 1.25;
  applyInteraction(bedGroup, selectedFurniture === 'sofa_or_bed', defaultBedZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, 0, defaultBedX);
  group.add(bedGroup);

  // Elegant study desk & contoured office chair (replaces the sofa)
  const deskGroup = new THREE.Group();
  deskGroup.name = 'studio_sofa';

  const deskPalette = getStylePalette(style);
  const woodMat = new THREE.MeshStandardMaterial({
    color: deskPalette.woodColor || 0xb88e6b,
    roughness: 0.6,
    metalness: 0.1
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: deskPalette.metalColor || 0x222225,
    metalness: deskPalette.metalMetalness !== undefined ? deskPalette.metalMetalness : 0.8,
    roughness: deskPalette.metalRoughness !== undefined ? deskPalette.metalRoughness : 0.4
  });

  // Desk top
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.04, 0.6), woodMat);
  deskTop.position.set(0, 0.74, 0);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  deskGroup.add(deskTop);

  // Slim legs
  const legGeo = new THREE.CylinderGeometry(0.018, 0.012, 0.72, 8);
  const legFL = new THREE.Mesh(legGeo, darkMetal);
  legFL.position.set(-0.55, 0.36, 0.24);
  legFL.castShadow = true;
  deskGroup.add(legFL);

  const legFR = legFL.clone();
  legFR.position.x = 0.55;
  deskGroup.add(legFR);

  const legBL = legFL.clone();
  legBL.position.z = -0.24;
  deskGroup.add(legBL);

  const legBR = legFR.clone();
  legBR.position.z = -0.24;
  deskGroup.add(legBR);

  // Modern minimal desk task lamp
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32), darkMetal);
  lampPole.position.set(-0.45, 0.9, -0.15);
  deskGroup.add(lampPole);

  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.08), darkMetal);
  lampShade.position.set(-0.45, 1.06, -0.15);
  lampShade.rotation.x = Math.PI / 4;
  deskGroup.add(lampShade);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff0bb }));
  bulb.position.set(-0.42, 1.04, -0.12);
  deskGroup.add(bulb);

  // Comfort Office Chair with seat cushion, backing and star-shaped support
  const chairSub = new THREE.Group();
  chairSub.position.set(0, 0, 0.45); // placed directly in front of the desk
  chairSub.rotation.y = Math.PI / 16; // slightly rotated naturally

  const fabricMat = new THREE.MeshStandardMaterial({
    color: deskPalette.couchColor || 0x6e7e85,
    roughness: 0.8
  });

  const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), fabricMat);
  seatCushion.position.y = 0.44;
  seatCushion.castShadow = true;
  chairSub.add(seatCushion);

  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.05), fabricMat);
  chairBack.position.set(0, 0.68, 0.2);
  chairBack.castShadow = true;
  chairSub.add(chairBack);

  // Chrome support rod and star base
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), darkMetal);
  rod.position.y = 0.315;
  chairSub.add(rod);

  const baseLine = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.03), darkMetal);
  baseLine.position.y = 0.21;
  chairSub.add(baseLine);

  const baseLine2 = baseLine.clone();
  baseLine2.rotation.y = Math.PI / 2;
  chairSub.add(baseLine2);

  deskGroup.add(chairSub);

  const defaultDeskX = -roomW / 2 + 1.15;
  const defaultDeskZ = roomD / 2 - 0.85;
  applyInteraction(deskGroup, selectedFurniture === 'studio_sofa', defaultDeskZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, Math.PI, defaultDeskX);
  group.add(deskGroup);

  // High-end Double-Door Modular Wardrobe Closet (replaces the tiny nested table)
  const wardrobeGroup = new THREE.Group();
  wardrobeGroup.name = 'coffee_table';

  const woodWrdMat = new THREE.MeshStandardMaterial({ color: 0x4d3f35, roughness: 0.65 });
  const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 });

  // Main Closet cabinet body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.95, 0.58), woodWrdMat);
  body.position.y = 0.975;
  body.castShadow = true;
  body.receiveShadow = true;
  wardrobeGroup.add(body);

  // Double door split groove
  const splitLine = new THREE.Mesh(new THREE.BoxGeometry(0.005, 1.9, 0.585), new THREE.MeshStandardMaterial({ color: 0x221a15 }));
  splitLine.position.set(0, 0.975, 0.001);
  wardrobeGroup.add(splitLine);

  // Fine brass door handles
  const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.015), trimGoldMat);
  handleL.position.set(-0.04, 1.0, 0.292);
  wardrobeGroup.add(handleL);

  const handleR = handleL.clone();
  handleR.position.x = 0.04;
  wardrobeGroup.add(handleR);

  // Wardrobe top molding
  const topMolding = new THREE.Mesh(new THREE.BoxGeometry(1.09, 0.04, 0.62), woodWrdMat);
  topMolding.position.y = 1.965;
  topMolding.castShadow = true;
  wardrobeGroup.add(topMolding);

  const defaultWardrobeX = roomW / 2 - 0.75;
  const defaultWardrobeZ = -roomD / 2 + 0.55;
  applyInteraction(wardrobeGroup, selectedFurniture === 'coffee_table', defaultWardrobeZ, furnitureX, furnitureZ, furnitureRot, furnitureScale, 0, defaultWardrobeX);
  group.add(wardrobeGroup);

  // --- PRIVATE EN-SUITE BATHROOM AREA - RELOCATED TO FRONT-RIGHT CORNER (獨立套房衛浴空間 - 移植至前右角落，完全不擋開門並更開闊) ---
  const bathGroup = new THREE.Group();
  bathGroup.name = "studio_bathroom";

  const fMetalMat = new THREE.MeshStandardMaterial({ color: 0x222224, metalness: 0.8, roughness: 0.3 });
  const fGlassMat = new THREE.MeshStandardMaterial({ color: 0xddeeed, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const whiteCeramic = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.15 });
  const silverChr = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
  const slateFloor = new THREE.MeshStandardMaterial({ color: 0x3d4147, roughness: 0.65 });

  // Front-Right is X > 0, Z > 0
  const bathX = roomW / 2 - 0.85;
  const bathZ = roomD / 2 - 0.95;

  // L-shaped Frosted Glass Partition Walls
  // 1. Horizontal panel facing the rear room (width 1.05m starting from right wall, leaving 0.65m door gap)
  const wallH = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.2, 0.03), fGlassMat);
  wallH.position.set(bathX + 0.325, 1.1, bathZ - 0.95);
  wallH.castShadow = true;
  bathGroup.add(wallH);

  const frameH = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.04, 0.04), fMetalMat);
  frameH.position.set(bathX + 0.325, 2.18, bathZ - 0.95);
  bathGroup.add(frameH);

  // 2. Vertical panel separating the bathroom and custom bedroom zone (width 1.9m)
  const wallV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.2, 1.9), fGlassMat);
  wallV.position.set(bathX - 0.85, 1.1, bathZ);
  wallV.castShadow = true;
  bathGroup.add(wallV);

  const frameVTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.9), fMetalMat);
  frameVTop.position.set(bathX - 0.85, 2.18, bathZ);
  bathGroup.add(frameVTop);

  const frameVLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.04), fMetalMat);
  frameVLeft.position.set(bathX - 0.85, 1.1, bathZ + 0.95);
  bathGroup.add(frameVLeft);

  const frameVRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.04), fMetalMat);
  frameVRight.position.set(bathX - 0.85, 1.1, bathZ - 0.95);
  bathGroup.add(frameVRight);

  // Elevated warm grey tile floor tray
  const bathFloor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.015, 1.9), slateFloor);
  bathFloor.position.set(bathX, 0.0075, bathZ);
  bathFloor.receiveShadow = true;
  bathGroup.add(bathFloor);

  // A. Toilet (馬桶 - placed at front-right space facing the center)
  const toiletSub = new THREE.Group();
  toiletSub.position.set(bathX + 0.3, 0, bathZ + 0.65);

  const baseBowl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.56), whiteCeramic);
  baseBowl.position.y = 0.21;
  baseBowl.castShadow = true;
  toiletSub.add(baseBowl);

  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.22), whiteCeramic);
  tank.position.set(0, 0.645, 0.17);
  tank.castShadow = true;
  toiletSub.add(tank);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.52), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.1 }));
  seat.position.set(0, 0.43, -0.02);
  toiletSub.add(seat);
  bathGroup.add(toiletSub);

  // B. Modern Vanity with Sink and Hanging Backlit Mirror
  const vanitySub = new THREE.Group();
  vanitySub.position.set(bathX - 0.35, 0, bathZ + 0.65);

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.78, 0.45), new THREE.MeshStandardMaterial({ color: 0x47494f, roughness: 0.6 }));
  cabinet.position.y = 0.39;
  cabinet.castShadow = true;
  vanitySub.add(cabinet);

  const basin = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.48), whiteCeramic);
  basin.position.y = 0.805;
  basin.castShadow = true;
  vanitySub.add(basin);

  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12), getFaucetChromeMaterial());
  faucet.position.set(0, 0.89, 0.15);
  vanitySub.add(faucet);

  // Floating back-lit round mirror
  const mirrorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.012, 32);
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.05, metalness: 0.95 });
  const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
  mirror.rotation.x = Math.PI / 2;
  mirror.position.set(0, 1.45, 0.21);
  vanitySub.add(mirror);

  const backlight = new THREE.Mesh(new THREE.CylinderGeometry(0.246, 0.246, 0.008, 32), new THREE.MeshBasicMaterial({ color: 0xffeedd }));
  backlight.rotation.x = Math.PI / 2;
  backlight.position.set(0, 1.45, 0.216);
  vanitySub.add(backlight);
  bathGroup.add(vanitySub);

  // C. Premium Shower Cubicle (淋浴區 - in deep right corner)
  const showerSub = new THREE.Group();
  showerSub.position.set(bathX + 0.45, 0, bathZ - 0.5);

  const showerFloor = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.75), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 }));
  showerFloor.position.y = 0.02;
  showerFloor.receiveShadow = true;
  showerSub.add(showerFloor);

  const showerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.8), silverChr);
  showerPole.position.set(-0.32, 0.9, 0.32);
  showerSub.add(showerPole);

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 16), silverChr);
  head.rotation.x = Math.PI / 2;
  head.position.set(-0.24, 1.8, 0.24);
  showerSub.add(head);
  bathGroup.add(showerSub);

  group.add(bathGroup);

  return group;
};
