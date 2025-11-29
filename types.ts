
export type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'tree' | 'custom' | 'image';

export interface ShapeData {
  id: string;
  name: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  points?: [number, number, number][]; // For custom extruded shapes
  extrudeDepth?: number; // For custom shapes push/pull
  
  // Image properties
  imageUrl?: string;
  aspectRatio?: number;

  color: string;
  secondaryColor?: string; // For Tree Trunk
  opacity: number;
  visible: boolean;
  locked: boolean; // New property
  wireframe: boolean;
  edges: boolean;
  edgeColor: string;
}

export type ViewMode = 'perspective' | 'orthographic';

export interface CameraSetting {
  position: [number, number, number];
  zoom: number;
}
