import { useRef, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrganMeshDef } from '@/data/organPositions';
import { getOrganGeometry } from './organGeometries';

interface OrganMeshProps {
  organ: OrganMeshDef;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function OrganMesh({ organ, isSelected, isHovered, onSelect, onHover }: OrganMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Build organ geometry from the factory (custom multi-part shapes per organ)
  const geometry = useMemo(() => getOrganGeometry(organ.id), [organ.id]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Color variants
  const baseColor    = useMemo(() => new THREE.Color(organ.color), [organ.color]);
  const hoverColor   = useMemo(() => baseColor.clone().multiplyScalar(1.35), [baseColor]);
  const selectedColor = useMemo(() => baseColor.clone().multiplyScalar(1.65), [baseColor]);

  // Per-frame: lerp color, emissive, and scale toward their targets
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;

    const targetColor = isSelected ? selectedColor : isHovered ? hoverColor : baseColor;
    mat.color.lerp(targetColor, delta * 8);

    const targetEmissive = isSelected
      ? baseColor.clone().multiplyScalar(0.45)
      : isHovered
      ? baseColor.clone().multiplyScalar(0.22)
      : new THREE.Color(0, 0, 0);
    mat.emissive.lerp(targetEmissive, delta * 8);

    const sf = isSelected ? 1.14 : 1.0;
    meshRef.current.scale.lerp(
      new THREE.Vector3(organ.scale[0] * sf, organ.scale[1] * sf, organ.scale[2] * sf),
      delta * 6,
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={organ.position}
      scale={organ.scale}
      geometry={geometry}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(organ.id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(organ.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = 'default';
      }}
    >
      {/*
       * MeshPhysicalMaterial gives organs a wet, organic look:
       *   clearcoat  → glossy surface sheen (moist tissue)
       *   roughness  → moderate, prevents mirror-like reflections
       */}
      <meshPhysicalMaterial
        color={organ.color}
        roughness={0.42}
        metalness={0.04}
        clearcoat={0.55}
        clearcoatRoughness={0.25}
        transparent
        opacity={isSelected ? 0.97 : isHovered ? 0.92 : 0.88}
      />

      {(isHovered || isSelected) && (
        <Html
          position={organ.labelOffset}
          style={{ pointerEvents: 'none' }}
          distanceFactor={2}
          zIndexRange={[1, 10]}
        >
          <div
            style={{
              background: 'rgba(10,12,20,0.82)',
              color: '#f0f4ff',
              border: `1px solid ${organ.color}60`,
              borderLeft: `3px solid ${organ.color}`,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: `0 2px 12px ${organ.color}30`,
              letterSpacing: '0.02em',
            }}
          >
            {organ.name}
          </div>
        </Html>
      )}
    </mesh>
  );
}
