
export type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'tree' | 'custom' | 'image' | 'model' | 'group';

export interface ShapeData {
  id: string;
  name: string;
  type: ShapeType;
  parentId?: string; // For grouping
  collapsed?: boolean; // For layer tree UI

  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  points?: [number, number, number][]; // For custom extruded shapes
  extrudeDepth?: number; // For custom shapes push/pull
  
  // Image properties
  imageUrl?: string;
  aspectRatio?: number;

  // Model properties
  modelUrl?: string;
  modelNodeName?: string; // Specific node name within the GLB

  color: string;
  secondaryColor?: string; // For Tree Trunk
  opacity: number;
  visible: boolean;
  locked: boolean; 
  wireframe: boolean;
  edges: boolean;
  edgeColor: string;
}

export type ViewMode = 'perspective' | 'orthographic';

export interface CameraSetting {
  position: [number, number, number];
  zoom: number;
}

export interface SunSettings {
  enabled: boolean;
  showPath: boolean;
  latitude: number;
  longitude: number;
  date: number; // Day of year (0-365)
  time: number; // Hour of day (0-24)
  radius: number; // Scale of the sunpath diagram
  sunColor: string;
  pathColor: string;
  shadowColor: string;
}
