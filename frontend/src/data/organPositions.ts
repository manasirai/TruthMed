/**
 * 3D organ mesh data for the anatomy explorer.
 *
 * Positions are in Three.js scene units, mapped to a human body ~2 units tall
 * (1 unit ≈ 0.9 m).  Scales are tuned for the multi-part geometries produced
 * by organGeometries.ts — each geometry has a bounding box of roughly ±0.5 units
 * before scaling, except multi-part organs (brain, lungs, kidneys, intestines)
 * whose bounding boxes are larger.
 *
 * To use a licensed segmented glTF model:
 *   1. Update getOrganGeometry() in organGeometries.ts to return the mesh geometry.
 *   2. Adjust position/scale here to match the loaded model's coordinate space.
 */

export interface OrganMeshDef {
  id: string;
  name: string;
  system: string;
  color: string;
  /** World position of the organ group centre. */
  position: [number, number, number];
  /** Non-uniform scale applied to the geometry from organGeometries.ts. */
  scale: [number, number, number];
  /** Html label offset from the mesh pivot. */
  labelOffset: [number, number, number];
}

export const ORGAN_MESHES: OrganMeshDef[] = [
  {
    id: 'brain',
    name: 'Brain',
    system: 'Nervous',
    color: '#a855f7',
    // Brain geometry spans ≈ ±0.63 x, ±0.65 y → scale to fit inside head sphere (r=0.185)
    position: [0, 1.56, 0.01],
    scale: [0.155, 0.145, 0.145],
    labelOffset: [0.26, 0.1, 0],
  },
  {
    id: 'heart',
    name: 'Heart',
    system: 'Cardiovascular',
    color: '#ef4444',
    // Heart geometry spans ≈ ±0.56 x, ±0.72 y
    position: [-0.07, 1.04, 0.09],
    scale: [0.108, 0.098, 0.096],
    labelOffset: [0.22, 0, 0],
  },
  {
    id: 'lungs',
    name: 'Lungs',
    system: 'Respiratory',
    color: '#60a5fa',
    // Lung geometry spans ≈ ±0.7 x, ±0.56 y
    position: [0, 1.06, 0.02],
    scale: [0.245, 0.24, 0.13],
    labelOffset: [0.38, 0.1, 0],
  },
  {
    id: 'liver',
    name: 'Liver',
    system: 'Digestive',
    color: '#b45309',
    // Liver geometry spans ≈ ±0.72 x, ±0.38 y
    position: [0.14, 0.74, 0.05],
    scale: [0.19, 0.14, 0.12],
    labelOffset: [0.26, 0.06, 0],
  },
  {
    id: 'stomach',
    name: 'Stomach',
    system: 'Digestive',
    color: '#f59e0b',
    // Stomach geometry spans ≈ ±0.46 x, ±0.5 y
    position: [-0.09, 0.70, 0.07],
    scale: [0.115, 0.115, 0.1],
    labelOffset: [-0.24, 0, 0],
  },
  {
    id: 'pancreas',
    name: 'Pancreas',
    system: 'Digestive',
    color: '#f97316',
    // Pancreas geometry spans ≈ ±0.55 x, ±0.3 y (elongated)
    position: [-0.04, 0.63, -0.03],
    scale: [0.13, 0.065, 0.065],
    labelOffset: [-0.24, 0, 0],
  },
  {
    id: 'kidneys',
    name: 'Kidneys',
    system: 'Urinary',
    color: '#dc2626',
    // Kidney geometry spans ≈ ±0.62 x (both kidneys), ±0.45 y
    position: [0, 0.54, -0.11],
    scale: [0.085, 0.115, 0.082],
    labelOffset: [0.24, 0, 0],
  },
  {
    id: 'intestines',
    name: 'Intestines',
    system: 'Digestive',
    color: '#c2410c',
    // Intestines geometry spans ≈ ±0.5 x, ±0.5 y
    position: [0, 0.30, 0.06],
    scale: [0.24, 0.24, 0.11],
    labelOffset: [0.32, 0.1, 0],
  },
  {
    id: 'bladder',
    name: 'Bladder',
    system: 'Urinary',
    color: '#eab308',
    position: [0, 0.08, 0.07],
    scale: [0.09, 0.09, 0.08],
    labelOffset: [0.2, -0.06, 0],
  },
  {
    id: 'thyroid',
    name: 'Thyroid',
    system: 'Endocrine',
    color: '#10b981',
    // Thyroid geometry spans ≈ ±0.48 x (two lobes + isthmus)
    position: [0, 1.30, 0.11],
    scale: [0.092, 0.058, 0.052],
    labelOffset: [0.2, 0, 0],
  },
  {
    id: 'spleen',
    name: 'Spleen',
    system: 'Lymphatic',
    color: '#9333ea',
    position: [-0.19, 0.73, -0.05],
    scale: [0.1, 0.11, 0.08],
    labelOffset: [-0.24, 0, 0],
  },
];

export const SYSTEM_COLORS: Record<string, string> = {
  Nervous:       '#a855f7',
  Cardiovascular:'#ef4444',
  Respiratory:   '#60a5fa',
  Digestive:     '#f97316',
  Urinary:       '#eab308',
  Endocrine:     '#10b981',
  Lymphatic:     '#9333ea',
};
