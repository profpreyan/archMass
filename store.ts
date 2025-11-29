
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ShapeData, ShapeType, ViewMode } from './types';

export interface CameraRequest {
  id: string;
  type: 'iso' | 'axo' | 'top' | 'front' | 'right' | 'left' | 'back' | 'bottom';
}

interface AppState {
  shapes: ShapeData[];
  selectedId: string | null;
  
  // History
  history: {
    past: ShapeData[][];
    future: ShapeData[][];
  };

  // Scene Settings
  backgroundColor: string;
  gridVisible: boolean;
  shadowsEnabled: boolean;
  
  // Grid Settings
  gridSpacing: number;
  gridColor: string;
  gridSectionColor: string;
  
  // Tool Settings
  transformMode: 'translate' | 'rotate' | 'scale' | 'pushpull';
  isDrawing: boolean;
  isDragging: boolean; 
  drawingPoints: [number, number, number][];
  
  snapEnabled: boolean;
  objectSnapEnabled: boolean;
  snapGrid: number;
  
  // View Settings
  viewMode: ViewMode;
  cameraRequest: CameraRequest | null;
  
  // Actions
  snapshot: () => void;
  undo: () => void;
  redo: () => void;

  addShape: (type: ShapeType, extraData?: Partial<ShapeData>) => void;
  selectShape: (id: string | null) => void;
  updateShape: (id: string, updates: Partial<ShapeData>) => void;
  toggleShapeVisibility: (id: string) => void;
  toggleShapeLock: (id: string) => void; 
  deleteSelected: () => void;
  
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale' | 'pushpull') => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setIsDragging: (isDragging: boolean) => void;
  addDrawingPoint: (point: [number, number, number]) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  toggleSnap: () => void;
  toggleObjectSnap: () => void;
  setSnapGrid: (val: number) => void;
  
  setBackgroundColor: (color: string) => void;
  setGridVisible: (visible: boolean) => void;
  setGridSpacing: (spacing: number) => void;
  setGridColor: (color: string) => void;
  setGridSectionColor: (color: string) => void;
  
  setViewMode: (mode: ViewMode) => void;
  requestCameraView: (type: CameraRequest['type']) => void;
}

export const useStore = create<AppState>((set, get) => ({
  shapes: [
    {
      id: 'default-box',
      name: 'Box 01',
      type: 'box',
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#e2e8f0',
      opacity: 1,
      visible: true,
      locked: false,
      wireframe: false,
      edges: true,
      edgeColor: '#1e293b'
    }
  ],
  selectedId: null,
  
  history: { past: [], future: [] },

  backgroundColor: '#f1f5f9',
  gridVisible: true,
  shadowsEnabled: true,
  
  gridSpacing: 1,
  gridColor: '#cbd5e1',
  gridSectionColor: '#94a3b8',
  
  transformMode: 'translate',
  isDrawing: false,
  isDragging: false,
  drawingPoints: [],

  snapEnabled: true,
  objectSnapEnabled: false,
  snapGrid: 0.5,
  
  viewMode: 'perspective',
  cameraRequest: null,
  
  // --- HISTORY ACTIONS ---
  snapshot: () => set((state) => {
    const newPast = [...state.history.past, state.shapes];
    if (newPast.length > 10) newPast.shift(); // Keep last 10 steps
    return {
      history: {
        past: newPast,
        future: []
      }
    };
  }),

  undo: () => set((state) => {
    if (state.history.past.length === 0) return {};
    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);
    
    return {
      shapes: previous,
      selectedId: null, // Deselect to avoid ghosting
      history: {
        past: newPast,
        future: [state.shapes, ...state.history.future]
      }
    };
  }),

  redo: () => set((state) => {
    if (state.history.future.length === 0) return {};
    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);
    
    return {
      shapes: next,
      selectedId: null,
      history: {
        past: [...state.history.past, state.shapes],
        future: newFuture
      }
    };
  }),

  addShape: (type, extraData: Partial<ShapeData> = {}) => {
    get().snapshot();
    set((state) => {
      const count = state.shapes.filter(s => s.type === type).length + 1;
      const name = extraData.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${count.toString().padStart(2, '0')}`;
      
      let yPos = 0.5;
      if (type === 'plane' || type === 'image') yPos = 0;
      if (type === 'tree') yPos = 0; 

      const color = type === 'tree' ? '#ffffff' : type === 'plane' ? '#94a3b8' : '#e2e8f0';
      const secondaryColor = type === 'tree' ? '#5d4037' : undefined;

      const newShape: ShapeData = {
        id: uuidv4(),
        name,
        type,
        position: [0, yPos, 0],
        rotation: type === 'plane' || type === 'image' ? [-Math.PI / 2, 0, 0] : [0, 0, 0],
        scale: [1, 1, 1],
        extrudeDepth: 0,
        color,
        secondaryColor,
        opacity: 1,
        visible: true,
        locked: false,
        wireframe: false,
        edges: type !== 'tree' && type !== 'image',
        edgeColor: '#1e293b',
        ...extraData
      };
      return { shapes: [...state.shapes, newShape], selectedId: newShape.id, isDrawing: false, transformMode: 'translate' };
    });
  },
  
  selectShape: (id) => set({ selectedId: id }),
  
  updateShape: (id, updates) => set((state) => ({
    shapes: state.shapes.map((s) => s.id === id ? { ...s, ...updates } : s)
  })),

  toggleShapeVisibility: (id) => set((state) => ({
    shapes: state.shapes.map((s) => s.id === id ? { ...s, visible: !s.visible } : s)
  })),

  toggleShapeLock: (id) => set((state) => ({
    shapes: state.shapes.map((s) => s.id === id ? { ...s, locked: !s.locked } : s)
  })),
  
  deleteSelected: () => {
    get().snapshot();
    set((state) => ({
      shapes: state.shapes.filter(s => s.id !== state.selectedId),
      selectedId: null
    }));
  },
  
  setTransformMode: (mode) => set({ transformMode: mode, isDrawing: false }),
  
  setIsDrawing: (isDrawing) => set({ isDrawing, drawingPoints: [], selectedId: null }),
  setIsDragging: (isDragging) => set({ isDragging }),
  
  addDrawingPoint: (point) => set((state) => {
    const points = state.drawingPoints;
    if (points.length > 0) {
      const last = points[points.length - 1];
      const dist = Math.sqrt(
        Math.pow(point[0] - last[0], 2) + 
        Math.pow(point[2] - last[2], 2)
      );
      if (dist < 0.01) return {};
    }
    return { drawingPoints: [...state.drawingPoints, point] };
  }),

  finishDrawing: () => {
    const { drawingPoints, shapes } = get();
    if (drawingPoints.length < 3) return; 

    get().snapshot();

    // 1. Calculate Bounds
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    drawingPoints.forEach(p => {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minZ = Math.min(minZ, p[2]);
      maxZ = Math.max(maxZ, p[2]);
    });

    // 2. Calculate Centroid 
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // 3. Normalize points relative to centroid
    const normalizedPoints = drawingPoints.map(p => [
      p[0] - centerX, 
      0, 
      p[2] - centerZ
    ]) as [number, number, number][];

    const count = shapes.filter(s => s.type === 'custom').length + 1;
    const newShape: ShapeData = {
      id: uuidv4(),
      name: `Surface ${count.toString().padStart(2, '0')}`,
      type: 'custom',
      position: [centerX, 0, centerZ],
      rotation: [0, 0, 0], 
      scale: [1, 1, 1],
      points: normalizedPoints,
      extrudeDepth: 0,
      color: '#cbd5e1',
      opacity: 1,
      visible: true,
      locked: false,
      wireframe: false,
      edges: true,
      edgeColor: '#1e293b'
    };

    set({ 
      shapes: [...shapes, newShape], 
      selectedId: newShape.id, 
      isDrawing: false, 
      drawingPoints: [] 
    });
  },

  cancelDrawing: () => set({ isDrawing: false, drawingPoints: [] }),
  
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  toggleObjectSnap: () => set((state) => ({ objectSnapEnabled: !state.objectSnapEnabled })),
  setSnapGrid: (val) => set({ snapGrid: val }),
  
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setGridVisible: (visible) => set({ gridVisible: visible }),
  setGridSpacing: (spacing) => set({ gridSpacing: spacing }),
  setGridColor: (color) => set({ gridColor: color }),
  setGridSectionColor: (color) => set({ gridSectionColor: color }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  requestCameraView: (type) => set({ 
    cameraRequest: { id: uuidv4(), type },
    viewMode: (type === 'iso' || type === 'axo') ? 'perspective' : 'orthographic'
  }),
}));
