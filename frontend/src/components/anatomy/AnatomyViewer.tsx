import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { HumanBodyMesh } from './HumanBodyMesh';
import { OrganMesh } from './OrganMesh';
import { ORGAN_MESHES } from '@/data/organPositions';

// ─── Camera controller ───────────────────────────────────────────────────────

function CameraController({ selectedOrganId }: { selectedOrganId: string | null }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!selectedOrganId) {
      camera.position.set(0, 0.8, 2.5);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0.8, 0);
        controlsRef.current.update();
      }
      return;
    }

    const organ = ORGAN_MESHES.find((o) => o.id === selectedOrganId);
    if (!organ) return;

    const [ox, oy, oz] = organ.position;
    const target  = new THREE.Vector3(ox, oy, oz);
    const camPos  = new THREE.Vector3(ox + 0.25, oy + 0.08, oz + 0.9);

    const startPos    = camera.position.clone();
    const startTarget = controlsRef.current
      ? controlsRef.current.target.clone()
      : new THREE.Vector3(0, 0.8, 0);

    const duration = 800;
    const start = performance.now();
    function animate() {
      const t     = Math.min((performance.now() - start) / duration, 1);
      const ease  = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      camera.position.lerpVectors(startPos, camPos, ease);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(startTarget, target, ease);
        controlsRef.current.update();
      }
      if (t < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [selectedOrganId, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.6}
      maxDistance={5}
      enablePan={false}
      target={[0, 0.8, 0]}
    />
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function Scene({
  selectedOrganId,
  hoveredOrganId,
  onSelect,
  onHover,
  showBody,
}: {
  selectedOrganId: string | null;
  hoveredOrganId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  showBody: boolean;
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.9, 2.5]} fov={42} />
      <CameraController selectedOrganId={selectedOrganId} />

      {/* Key light  front-right, simulates overhead operating-theatre light */}
      <directionalLight position={[1.5, 3.5, 2.5]} intensity={1.1} color="#fff8f2" />
      {/* Fill light  front-left, cool to suggest reflected ambient */}
      <directionalLight position={[-2.5, 1.5, 1.5]} intensity={0.45} color="#c8d8ff" />
      {/* Rim light  behind, gives separation from background */}
      <directionalLight position={[0, 0.5, -3]}    intensity={0.3}  color="#a0b8d8" />
      {/* Under-fill  lifts shadows on inferior organ surfaces */}
      <pointLight position={[0, -1.0, 1]} intensity={0.25} color="#ffe8d0" />
      {/* Ambient  prevents completely black shadows */}
      <ambientLight intensity={0.38} color="#e8eeff" />

      {/* Subtle floor disc for spatial grounding */}
      <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.7, 48]} />
        <meshStandardMaterial color="#1e2230" roughness={1} metalness={0} transparent opacity={0.35} />
      </mesh>

      {showBody && <HumanBodyMesh />}

      {ORGAN_MESHES.map((organ) => (
        <OrganMesh
          key={organ.id}
          organ={organ}
          isSelected={selectedOrganId === organ.id}
          isHovered={hoveredOrganId === organ.id}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

export type ViewMode = 'full' | 'organs';

interface AnatomyViewerProps {
  selectedOrganId: string | null;
  hoveredOrganId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  viewMode?: ViewMode;
  className?: string;
}

export function AnatomyViewer({
  selectedOrganId,
  hoveredOrganId,
  onSelect,
  onHover,
  viewMode = 'full',
  className,
}: AnatomyViewerProps) {
  return (
    <div className={className} aria-label="Interactive 3D human anatomy model">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene
            selectedOrganId={selectedOrganId}
            hoveredOrganId={hoveredOrganId}
            onSelect={onSelect}
            onHover={onHover}
            showBody={viewMode === 'full'}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
