
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ShapeData, ShapeType, ViewMode, SunSettings } from './types';
import * as THREE from 'three';

export interface CameraRequest {
  id: string;
  type: 'iso' | 'axo' | 'top' | 'front' | 'right' | 'left' | 'back' | 'bottom';
}

interface AppState {
  shapes: ShapeData[];
  selectedIds: string[]; // Changed from selectedId string | null
  clipboard: ShapeData | null;
  
  // UI State
  uiVisible: boolean;

  // History
  history: {
    past: ShapeData[][];
    future: ShapeData[][];
  };

  // Scene Settings
  backgroundColor: string;
  gridVisible: boolean;
  shadowsEnabled: boolean;
  
  // Sun Settings
  sunSettings: SunSettings;

  // Grid Settings
  gridSpacing: number;
  gridColor: string;
  gridSectionColor: string;
  
  // Tool Settings
  transformMode: 'translate' | 'rotate' | 'scale' | 'pushpull' | 'select';
  isDrawing: boolean;
  isDragging: boolean; 
  drawingPoints: [number, number, number][];
  
  snapEnabled: boolean;
  objectSnapEnabled: boolean;
  snapGrid: number;
  
  // View Settings
  viewMode: ViewMode;
  cameraRequest: CameraRequest | null;
  exportRequested: number; // Counter signal
  
  // Actions
  toggleUi: () => void;
  resetScene: () => void;

  snapshot: () => void;
  undo: () => void;
  redo: () => void;
  
  copy: () => void;
  paste: () => void;
  duplicateSelected: (withOffset?: boolean) => void;
  triggerExport: () => void;

  addShape: (type: ShapeType, extraData?: Partial<ShapeData>) => void;
  addShapes: (shapes: ShapeData[]) => void;
  
  selectShape: (id: string | null, multi?: boolean) => void;
  selectAll: () => void;
  setSelection: (ids: string[]) => void;

  updateShape: (id: string, updates: Partial<ShapeData>) => void;
  toggleShapeVisibility: (id: string) => void;
  toggleShapeLock: (id: string) => void; 
  deleteSelected: () => void;
  
  groupSelected: () => void;
  ungroupSelected: () => void;
  toggleGroupCollapse: (id: string) => void;

  setTransformMode: (mode: 'translate' | 'rotate' | 'scale' | 'pushpull' | 'select') => void;
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
  
  setSunSettings: (settings: Partial<SunSettings>) => void;

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
  selectedIds: [],
  clipboard: null,
  
  uiVisible: true,

  history: { past: [], future: [] },

  backgroundColor: '#f1f5f9',
  gridVisible: true,
  shadowsEnabled: true,
  
  sunSettings: {
    enabled: false,
    showPath: true,
    latitude: 40.7128, // NYC default
    longitude: -74.0060,
    date: 172, // Summer Solstice approx
    time: 12, // Noon UTC-ish reference
    radius: 20,
    sunColor: '#fcd34d',
    pathColor: '#94a3b8',
    shadowColor: '#000000'
  },

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
  exportRequested: 0,
  
  toggleUi: () => set((state) => ({ uiVisible: !state.uiVisible })),
  
  resetScene: () => set({
    shapes: [{
      id: uuidv4(),
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
    }],
    selectedIds: [],
    history: { past: [], future: [] },
  }),

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
      selectedIds: [], // Deselect to avoid ghosting
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
      selectedIds: [],
      history: {
        past: [...state.history.past, state.shapes],
        future: newFuture
      }
    };
  }),

  copy: () => {
    const { shapes, selectedIds } = get();
    if (selectedIds.length === 0) return;
    const shape = shapes.find(s => s.id === selectedIds[0]); // Copy primary selection for now
    if (shape) {
       set({ clipboard: { ...shape } });
    }
  },

  paste: () => {
    get().duplicateSelected(true); // Reuse duplicate logic with offset for paste
  },

  duplicateSelected: (withOffset = true) => {
    const { shapes, selectedIds, snapshot } = get();
    if (selectedIds.length === 0) return;
    snapshot();

    const newIds: string[] = [];
    const newShapes = [...shapes];

    // Find all items to duplicate (including children if group is selected, though copy logic handles group root)
    const itemsToClone = shapes.filter(s => selectedIds.includes(s.id));

    itemsToClone.forEach(item => {
        const newId = uuidv4();
        newIds.push(newId);
        const offset = withOffset ? 2 : 0;
        
        const clone: ShapeData = {
            ...item,
            id: newId,
            name: `${item.name} (Copy)`,
            position: [item.position[0] + offset, item.position[1], item.position[2] + offset],
            parentId: item.parentId // Keep parent if duplicating inside group? Usually duplication happens at same level
        };
        newShapes.push(clone);

        // If it's a group, we might need to deep clone children. 
        // For MVP simplicity, this shallow clones the selected object. 
        // If the object is a Group, its children need to be cloned too.
        if (item.type === 'group') {
             const children = shapes.filter(s => s.parentId === item.id);
             children.forEach(child => {
                 const childClone: ShapeData = {
                     ...child,
                     id: uuidv4(),
                     parentId: newId, // Point to new Group
                     // Position is relative to group, so it stays same
                 };
                 newShapes.push(childClone);
             });
        }
    });

    set({
        shapes: newShapes,
        selectedIds: newIds
    });
  },

  triggerExport: () => set(state => ({ exportRequested: state.exportRequested + 1 })),

  addShape: (type, extraData: Partial<ShapeData> = {}) => {
    get().snapshot();
    set((state) => {
      const count = state.shapes.filter(s => s.type === type).length + 1;
      const name = extraData.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${count.toString().padStart(2, '0')}`;
      
      let yPos = 0.5;
      if (type === 'plane' || type === 'image') yPos = 0;
      if (type === 'tree') yPos = 0; 
      if (type === 'model') yPos = 0;

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
        edges: type !== 'tree' && type !== 'image' && type !== 'model',
        edgeColor: '#1e293b',
        ...extraData
      };
      
      // If we are in Select mode, stay in Select mode, otherwise default to translate
      const nextMode = state.transformMode === 'select' ? 'select' : 'translate';
      return { shapes: [...state.shapes, newShape], selectedIds: [newShape.id], isDrawing: false, transformMode: nextMode };
    });
  },

  addShapes: (newShapes: ShapeData[]) => {
     get().snapshot();
     set((state) => ({
        shapes: [...state.shapes, ...newShapes],
        selectedIds: newShapes.length > 0 ? [newShapes[newShapes.length - 1].id] : state.selectedIds,
        isDrawing: false,
        transformMode: state.transformMode === 'select' ? 'select' : 'translate'
     }));
  },
  
  selectShape: (id, multi = false) => set((state) => {
    if (!id) return { selectedIds: [] };
    
    if (multi) {
      if (state.selectedIds.includes(id)) {
        return { selectedIds: state.selectedIds.filter(sid => sid !== id) };
      } else {
        return { selectedIds: [...state.selectedIds, id] };
      }
    }
    
    return { selectedIds: [id] };
  }),

  selectAll: () => set((state) => ({
    // Select all visible and unlocked objects
    selectedIds: state.shapes.filter(s => s.visible && !s.locked).map(s => s.id)
  })),

  setSelection: (ids) => set({ selectedIds: ids }),
  
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
    set((state) => {
      const idsToDelete = new Set(state.selectedIds);
      
      // Recursive function to find all children of deleted items
      const findDescendants = (parentId: string) => {
        state.shapes.forEach(s => {
          if (s.parentId === parentId) {
            idsToDelete.add(s.id);
            findDescendants(s.id);
          }
        });
      };
      
      state.selectedIds.forEach(id => findDescendants(id));
      
      return {
        shapes: state.shapes.filter(s => !idsToDelete.has(s.id)),
        selectedIds: []
      };
    });
  },

  groupSelected: () => {
    const { shapes, selectedIds, snapshot } = get();
    if (selectedIds.length < 2) return;
    
    snapshot();

    // 1. Calculate Centroid
    const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
    const centroid = new THREE.Vector3();
    selectedShapes.forEach(s => {
       centroid.add(new THREE.Vector3(...s.position));
    });
    centroid.divideScalar(selectedShapes.length);

    // 2. Create Group Object
    const groupId = uuidv4();
    const groupShape: ShapeData = {
      id: groupId,
      name: 'Group',
      type: 'group',
      position: [centroid.x, centroid.y, centroid.z],
      rotation: [0,0,0],
      scale: [1,1,1],
      color: '#ffffff',
      opacity: 1,
      visible: true,
      locked: false,
      wireframe: false,
      edges: false,
      edgeColor: '#000000',
      collapsed: false
    };

    // 3. Update Children to be relative to Group
    const updatedShapes = shapes.map(s => {
      if (selectedIds.includes(s.id)) {
        return {
          ...s,
          parentId: groupId,
          position: [
            s.position[0] - centroid.x,
            s.position[1] - centroid.y,
            s.position[2] - centroid.z
          ] as [number, number, number]
        };
      }
      return s;
    });

    set({
      shapes: [...updatedShapes, groupShape],
      selectedIds: [groupId]
    });
  },

  ungroupSelected: () => {
    const { shapes, selectedIds, snapshot } = get();
    if (selectedIds.length !== 1) return;
    
    const group = shapes.find(s => s.id === selectedIds[0]);
    if (!group || group.type !== 'group') return;

    snapshot();
    
    const groupPos = new THREE.Vector3(...group.position);
    const newSelection: string[] = [];

    const updatedShapes = shapes.map(s => {
       if (s.parentId === group.id) {
          newSelection.push(s.id);
          // Transform local back to world (simple translation approximation for MVP)
          return {
             ...s,
             parentId: undefined,
             position: [
                s.position[0] + groupPos.x,
                s.position[1] + groupPos.y,
                s.position[2] + groupPos.z
             ] as [number, number, number]
          };
       }
       return s;
    }).filter(s => s.id !== group.id); // Remove the group object

    set({
       shapes: updatedShapes,
       selectedIds: newSelection
    });
  },
  
  toggleGroupCollapse: (id) => set((state) => ({
    shapes: state.shapes.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s)
  })),

  setTransformMode: (mode) => set({ transformMode: mode, isDrawing: false }),
  
  setIsDrawing: (isDrawing) => set({ isDrawing, drawingPoints: [], selectedIds: [] }),
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
      selectedIds: [newShape.id], 
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
  
  setSunSettings: (settings) => set((state) => ({
    sunSettings: { ...state.sunSettings, ...settings }
  })),

  setViewMode: (mode) => set({ viewMode: mode }),
  requestCameraView: (type) => set({ 
    cameraRequest: { id: uuidv4(), type },
    viewMode: (type === 'iso' || type === 'axo') ? 'perspective' : 'orthographic'
  }),
}));
