import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Procedural human body silhouette.
 *
 * Renders a semi-transparent figure using MeshPhysicalMaterial so organs
 * are visible inside. The body is assembled from standard primitives sized
 * to anatomically proportionate dimensions (~1.8 m figure in a 2-unit scene).
 *
 * To replace with a licensed glTF body mesh:
 *   - Load with useGLTF and replace this component.
 *   - The organ meshes in AnatomyViewer will continue to work unchanged.
 */

interface PartDef {
  type: 'sphere' | 'capsule' | 'cylinder';
  args: number[];
  pos: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
}

const BODY_PARTS: PartDef[] = [
  // Head
  { type: 'sphere',   args: [0.185, 28, 20],         pos: [0,      1.58,  0] },
  // Neck
  { type: 'cylinder', args: [0.068, 0.08, 0.17, 14], pos: [0,      1.35,  0] },
  // Upper chest
  { type: 'capsule',  args: [0.21, 0.42, 10, 18],    pos: [0,      1.02,  0],  scale: [1.12, 1, 0.72] },
  // Shoulder breadth cap
  { type: 'sphere',   args: [0.28, 22, 14],           pos: [0,      1.12,  0],  scale: [1, 0.28, 0.52] },
  // Abdomen
  { type: 'sphere',   args: [0.2, 22, 16],            pos: [0,      0.62,  0],  scale: [1, 1.05, 0.78] },
  // Pelvis
  { type: 'sphere',   args: [0.23, 22, 16],           pos: [0,      0.42,  0],  scale: [1.05, 0.6, 0.82] },
  // Left shoulder
  { type: 'sphere',   args: [0.09, 16, 12],           pos: [-0.28,  1.2,   0],  scale: [1.4, 0.9, 0.9] },
  // Right shoulder
  { type: 'sphere',   args: [0.09, 16, 12],           pos: [0.28,   1.2,   0],  scale: [1.4, 0.9, 0.9] },
  // Left upper arm
  { type: 'capsule',  args: [0.055, 0.28, 8, 12],     pos: [-0.36,  0.97,  0],  rot: [0, 0,  0.12] },
  // Right upper arm
  { type: 'capsule',  args: [0.055, 0.28, 8, 12],     pos: [0.36,   0.97,  0],  rot: [0, 0, -0.12] },
  // Left forearm
  { type: 'capsule',  args: [0.045, 0.26, 8, 12],     pos: [-0.4,   0.62,  0],  rot: [0, 0,  0.08] },
  // Right forearm
  { type: 'capsule',  args: [0.045, 0.26, 8, 12],     pos: [0.4,    0.62,  0],  rot: [0, 0, -0.08] },
  // Left thigh
  { type: 'capsule',  args: [0.09, 0.36, 8, 12],      pos: [-0.12,  0.14,  0] },
  // Right thigh
  { type: 'capsule',  args: [0.09, 0.36, 8, 12],      pos: [0.12,   0.14,  0] },
  // Left shin
  { type: 'capsule',  args: [0.065, 0.36, 8, 12],     pos: [-0.13, -0.28,  0] },
  // Right shin
  { type: 'capsule',  args: [0.065, 0.36, 8, 12],     pos: [0.13,  -0.28,  0] },
];

function makeGeo(p: PartDef): THREE.BufferGeometry {
  switch (p.type) {
    case 'sphere':
      return new THREE.SphereGeometry(p.args[0], p.args[1], p.args[2]);
    case 'cylinder':
      return new THREE.CylinderGeometry(p.args[0], p.args[1], p.args[2], p.args[3]);
    case 'capsule':
    default:
      return new THREE.CapsuleGeometry(p.args[0], p.args[1], p.args[2], p.args[3]);
  }
}

export function HumanBodyMesh() {
  const geos = useMemo(() => BODY_PARTS.map(makeGeo), []);

  // Semi-transparent skin  organs show through
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d6c4b2',
        roughness: 0.55,
        metalness: 0,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        clearcoat: 0.15,
        clearcoatRoughness: 0.4,
        depthWrite: false,
      }),
    []
  );

  // Slightly larger back-face gives a soft outline effect
  const outlineMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#a89880',
        roughness: 1,
        transparent: true,
        opacity: 0.11,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );

  return (
    <group renderOrder={-1}>
      {BODY_PARTS.map((part, i) => (
        <group
          key={i}
          position={part.pos}
          rotation={part.rot ?? [0, 0, 0]}
          scale={part.scale ?? [1, 1, 1]}
        >
          <mesh geometry={geos[i]} material={mat} />
          <mesh geometry={geos[i]} material={outlineMat} scale={[1.04, 1.04, 1.04]} />
        </group>
      ))}
    </group>
  );
}
