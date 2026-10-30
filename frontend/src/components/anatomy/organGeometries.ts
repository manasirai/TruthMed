/**
 * Organ geometry factories.
 *
 * Each function produces a BufferGeometry at unit scale (bounding box roughly ±0.5).
 * OrganMesh scales the result via organ.scale from organPositions.ts.
 *
 * Organs are assembled from multiple primitive sub-parts that together give
 * recognisable anatomical contours: heart chambers, lung lobes, kidney pair, etc.
 * This is a procedural educational model — not a medical-device dataset.
 *
 * To replace with a licensed glTF segmented model:
 *   1. Load the model with useGLTF.
 *   2. For each organ ID, traverse model.scene to find the matching mesh.
 *   3. Return mesh.geometry here (no code changes needed outside this file).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function merge(...geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const result = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return result ?? new THREE.SphereGeometry(0.5, 16, 12);
}

export function getOrganGeometry(organId: string): THREE.BufferGeometry {
  switch (organId) {
    case 'heart':       return createHeart();
    case 'brain':       return createBrain();
    case 'lungs':       return createLungs();
    case 'liver':       return createLiver();
    case 'kidneys':     return createKidneys();
    case 'stomach':     return createStomach();
    case 'pancreas':    return createPancreas();
    case 'intestines':  return createIntestines();
    case 'bladder':     return createBladder();
    case 'thyroid':     return createThyroid();
    case 'spleen':      return createSpleen();
    default:            return new THREE.SphereGeometry(0.5, 20, 16);
  }
}

// ─── Heart ──────────────────────────────────────────────────────────────────

function createHeart(): THREE.BufferGeometry {
  // Left ventricle — dominant mass, apex points downward
  const lv = new THREE.SphereGeometry(0.42, 26, 20);
  lv.scale(0.88, 1.15, 0.78);
  lv.translate(-0.07, -0.04, 0);

  // Right ventricle — anterior surface, slightly smaller
  const rv = new THREE.SphereGeometry(0.34, 24, 18);
  rv.scale(0.82, 0.98, 0.68);
  rv.translate(0.18, 0.02, 0.1);

  // Left atrium — superior-posterior dome
  const la = new THREE.SphereGeometry(0.19, 20, 14);
  la.scale(1.05, 0.88, 0.82);
  la.translate(-0.16, 0.44, -0.1);

  // Right atrium — superior-right dome
  const ra = new THREE.SphereGeometry(0.18, 20, 14);
  ra.scale(0.95, 0.88, 0.8);
  ra.translate(0.18, 0.42, -0.08);

  // Aortic root — exits superiorly toward left
  const aorta = new THREE.CylinderGeometry(0.07, 0.09, 0.24, 10);
  aorta.rotateZ(-0.22);
  aorta.translate(-0.04, 0.64, -0.04);

  // Pulmonary trunk — exits superiorly toward right
  const pulm = new THREE.CylinderGeometry(0.065, 0.075, 0.18, 10);
  pulm.rotateZ(0.35);
  pulm.translate(0.12, 0.6, 0.04);

  return merge(lv, rv, la, ra, aorta, pulm);
}

// ─── Brain ───────────────────────────────────────────────────────────────────

function createBrain(): THREE.BufferGeometry {
  // Right cerebral hemisphere
  const rHemi = new THREE.SphereGeometry(0.45, 32, 24);
  rHemi.scale(0.98, 0.92, 1.06);
  rHemi.translate(0.17, 0.07, 0);

  // Left cerebral hemisphere
  const lHemi = new THREE.SphereGeometry(0.45, 32, 24);
  lHemi.scale(0.98, 0.92, 1.06);
  lHemi.translate(-0.17, 0.07, 0);

  // Cerebellum — posterior inferior, wider than tall
  const cb = new THREE.SphereGeometry(0.3, 26, 18);
  cb.scale(1.28, 0.72, 1.0);
  cb.translate(0, -0.3, -0.28);

  // Brain stem
  const stem = new THREE.CylinderGeometry(0.088, 0.105, 0.3, 12);
  stem.translate(0, -0.5, -0.14);

  return merge(rHemi, lHemi, cb, stem);
}

// ─── Lungs ───────────────────────────────────────────────────────────────────

function createLungs(): THREE.BufferGeometry {
  // Right lung: 3 lobes (upper, middle, lower) — larger
  const rUpper = new THREE.SphereGeometry(0.27, 22, 16);
  rUpper.scale(0.86, 1.12, 0.72);
  rUpper.translate(0.31, 0.43, -0.02);

  const rMiddle = new THREE.SphereGeometry(0.2, 18, 14);
  rMiddle.scale(0.96, 0.78, 0.7);
  rMiddle.translate(0.34, 0.04, 0.06);

  const rLower = new THREE.SphereGeometry(0.3, 22, 16);
  rLower.scale(0.9, 1.02, 0.76);
  rLower.translate(0.3, -0.38, -0.02);

  // Left lung: 2 lobes, cardiac notch reduces medial surface
  const lUpper = new THREE.SphereGeometry(0.26, 22, 16);
  lUpper.scale(0.82, 1.14, 0.7);
  lUpper.translate(-0.3, 0.41, -0.02);

  const lLower = new THREE.SphereGeometry(0.27, 22, 16);
  lLower.scale(0.82, 0.97, 0.72);
  lLower.translate(-0.28, -0.3, -0.02);

  return merge(rUpper, rMiddle, rLower, lUpper, lLower);
}

// ─── Liver ───────────────────────────────────────────────────────────────────

function createLiver(): THREE.BufferGeometry {
  // Dominant right lobe — large, rounded, under diaphragm
  const rightLobe = new THREE.SphereGeometry(0.42, 26, 18);
  rightLobe.scale(1.15, 0.72, 0.88);
  rightLobe.translate(0.2, 0, 0);

  // Left lobe — smaller, tapers to a wedge
  const leftLobe = new THREE.SphereGeometry(0.28, 22, 16);
  leftLobe.scale(0.72, 0.58, 0.78);
  leftLobe.translate(-0.34, 0.06, 0.02);

  // Inferior surface filling (makes the underside more convex)
  const inferior = new THREE.SphereGeometry(0.3, 20, 14);
  inferior.scale(1.05, 0.5, 0.72);
  inferior.translate(0.06, -0.2, -0.04);

  return merge(rightLobe, leftLobe, inferior);
}

// ─── Kidneys ─────────────────────────────────────────────────────────────────

function createKidneys(): THREE.BufferGeometry {
  // Both kidneys — bean-shaped, flanking the spine
  // Right kidney (positive x in organ-local space)
  const rKidney = new THREE.SphereGeometry(0.3, 24, 18);
  rKidney.scale(0.64, 1.0, 0.58);
  rKidney.translate(0.34, 0.02, 0);

  // Left kidney (slightly superior to the right)
  const lKidney = new THREE.SphereGeometry(0.3, 24, 18);
  lKidney.scale(0.64, 1.0, 0.58);
  lKidney.translate(-0.34, 0.06, 0);

  return merge(rKidney, lKidney);
}

// ─── Stomach ─────────────────────────────────────────────────────────────────

function createStomach(): THREE.BufferGeometry {
  // Fundus — superior dome
  const fundus = new THREE.SphereGeometry(0.32, 22, 16);
  fundus.scale(0.92, 1.0, 0.76);
  fundus.translate(-0.1, 0.28, 0);

  // Body — main chamber
  const body = new THREE.SphereGeometry(0.29, 22, 16);
  body.scale(0.92, 1.05, 0.72);
  body.translate(0.02, -0.1, 0.02);

  // Antrum + pylorus — narrows toward duodenum (right side)
  const pylorus = new THREE.SphereGeometry(0.18, 18, 14);
  pylorus.scale(0.78, 0.72, 0.65);
  pylorus.translate(0.28, -0.36, 0.02);

  return merge(fundus, body, pylorus);
}

// ─── Pancreas ────────────────────────────────────────────────────────────────

function createPancreas(): THREE.BufferGeometry {
  // Head — right/bulky, nestled in duodenal curve
  const head = new THREE.SphereGeometry(0.25, 20, 14);
  head.scale(0.88, 0.84, 0.7);
  head.translate(0.3, 0, 0);

  // Body — connecting segment
  const body = new THREE.SphereGeometry(0.18, 18, 14);
  body.scale(0.8, 0.7, 0.6);
  body.translate(0.0, 0.04, 0);

  // Tail — tapers toward spleen
  const tail = new THREE.SphereGeometry(0.13, 16, 12);
  tail.scale(0.72, 0.62, 0.55);
  tail.translate(-0.28, 0.08, 0.02);

  return merge(head, body, tail);
}

// ─── Intestines ──────────────────────────────────────────────────────────────

function createIntestines(): THREE.BufferGeometry {
  // Small intestine — central coiled tube
  const numPts = 160;
  const coils = 3.2;
  const coilR = 0.28;
  const spts: THREE.Vector3[] = [];

  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const angle = t * coils * Math.PI * 2;
    const r = coilR * (0.96 - t * 0.18);
    spts.push(new THREE.Vector3(
      Math.cos(angle) * r,
      (t - 0.5) * 0.62,
      Math.sin(angle) * r * 0.52,
    ));
  }
  const sCurve = new THREE.CatmullRomCurve3(spts);
  const small = new THREE.TubeGeometry(sCurve, 80, 0.052, 6, false);

  // Large intestine — rectangular frame around the small intestine
  const corners: [number, number][] = [
    [0.42, -0.46],
    [0.44, 0.42],
    [0.0,  0.46],
    [-0.44, 0.42],
    [-0.42, -0.34],
  ];
  const lpts: THREE.Vector3[] = [];
  for (let c = 0; c < corners.length - 1; c++) {
    for (let s = 0; s <= 25; s++) {
      const t = s / 25;
      lpts.push(new THREE.Vector3(
        corners[c][0] + (corners[c + 1][0] - corners[c][0]) * t,
        corners[c][1] + (corners[c + 1][1] - corners[c][1]) * t,
        0.02,
      ));
    }
  }
  const lCurve = new THREE.CatmullRomCurve3(lpts);
  const large = new THREE.TubeGeometry(lCurve, 60, 0.082, 7, false);

  return merge(small, large);
}

// ─── Bladder ─────────────────────────────────────────────────────────────────

function createBladder(): THREE.BufferGeometry {
  const bladder = new THREE.SphereGeometry(0.42, 22, 16);
  bladder.scale(1.0, 1.12, 0.88);
  return bladder;
}

// ─── Thyroid ─────────────────────────────────────────────────────────────────

function createThyroid(): THREE.BufferGeometry {
  // Two lobes flanking the trachea
  const rightLobe = new THREE.SphereGeometry(0.26, 20, 14);
  rightLobe.scale(0.65, 1.35, 0.62);
  rightLobe.translate(0.22, 0, 0);

  const leftLobe = new THREE.SphereGeometry(0.26, 20, 14);
  leftLobe.scale(0.65, 1.35, 0.62);
  leftLobe.translate(-0.22, 0, 0);

  // Isthmus — bridge crossing the midline
  const isthmus = new THREE.CylinderGeometry(0.088, 0.088, 0.44, 10);
  isthmus.rotateZ(Math.PI / 2);

  return merge(rightLobe, leftLobe, isthmus);
}

// ─── Spleen ──────────────────────────────────────────────────────────────────

function createSpleen(): THREE.BufferGeometry {
  const spleen = new THREE.SphereGeometry(0.44, 24, 18);
  spleen.scale(1.0, 0.8, 0.7);
  return spleen;
}
