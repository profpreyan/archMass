
import React, { useRef, useEffect, useCallback } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { useStore } from '../store';
import { ShapeData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { 
  Box, Circle, Cylinder, Trees, 
  Move, RotateCw, Scaling, Trash2, 
  Magnet, PenTool,
  Image as ImageIcon, Undo, Redo, Sun,
  FolderOpen, Save, FilePlus, MousePointer2
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { 
    addShape, addShapes, transformMode, setTransformMode, 
    snapEnabled, toggleSnap, deleteSelected, selectedIds,
    isDrawing, setIsDrawing,
    undo, redo, copy, paste,
    sunSettings, setSunSettings,
    triggerExport, groupSelected, ungroupSelected,
    history,
    resetScene,
    setBackgroundColor, setGridVisible, setGridSpacing, setGridColor, setGridSectionColor
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        addShape('image', { imageUrl: url, aspectRatio, name: file.name });
      };
      img.src = url;
    }
    if (e.target) e.target.value = '';
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       const url = URL.createObjectURL(file);
       const loader = new GLTFLoader();
       
       loader.load(url, (gltf) => {
          // --- RESTORE GLOBAL SETTINGS ---
          // Check root userData or the first child (if group was exported)
          const root = gltf.scene;
          let settings = root.userData?.appSettings;
          if (!settings && root.children.length > 0) {
              settings = root.children[0].userData?.appSettings;
          }

          if (settings) {
              if (settings.backgroundColor) setBackgroundColor(settings.backgroundColor);
              if (settings.gridVisible !== undefined) setGridVisible(settings.gridVisible);
              if (settings.gridSpacing) setGridSpacing(settings.gridSpacing);
              if (settings.gridColor) setGridColor(settings.gridColor);
              if (settings.gridSectionColor) setGridSectionColor(settings.gridSectionColor);
              if (settings.sunSettings) setSunSettings(settings.sunSettings);
          }

          const newShapes: ShapeData[] = [];
          gltf.scene.updateMatrixWorld(true);

          const processNode = (node: THREE.Object3D) => {
             if (node.userData && node.userData.isArchMass && node.userData.shapeData) {
                const originalData = node.userData.shapeData as ShapeData;
                newShapes.push({ ...originalData, id: uuidv4() });
                return;
             }

             if ((node as THREE.Mesh).isMesh) {
                if (node.type === 'Line' || node.type === 'LineSegments' || node.type === 'Points') return;

                const pos = new THREE.Vector3();
                const rot = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                node.matrixWorld.decompose(pos, rot, scale);
                const euler = new THREE.Euler().setFromQuaternion(rot);

                const shapeId = uuidv4();
                newShapes.push({
                   id: shapeId,
                   name: node.name || `Part ${newShapes.length + 1}`,
                   type: 'model',
                   position: [pos.x, pos.y, pos.z],
                   rotation: [euler.x, euler.y, euler.z],
                   scale: [scale.x, scale.y, scale.z],
                   modelUrl: url,
                   modelNodeName: node.name,
                   color: '#ffffff',
                   opacity: 1,
                   visible: true,
                   locked: false,
                   wireframe: false,
                   edges: false,
                   edgeColor: '#000000'
                });
             }
             if (node.children) node.children.forEach(processNode);
          };

          processNode(gltf.scene);

          if (newShapes.length > 0) {
             addShapes(newShapes);
          } else {
             addShape('model', { modelUrl: url, name: file.name });
          }
       }, undefined, (err) => {
          console.error("Error loading GLB:", err);
          alert("Could not load 3D model.");
       });
    }
    if (e.target) e.target.value = '';
  }

  const handleNewFile = useCallback(() => {
     if (window.confirm("Start a new file? All unsaved changes will be lost.")) {
        resetScene();
     }
  }, [resetScene]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      // Tools
      if (e.key === '1') addShape('box');
      if (e.key === '2') addShape('sphere');
      if (e.key === '3') addShape('cylinder');
      if (e.key === '4') addShape('tree');
      if (e.key.toLowerCase() === 'p') setIsDrawing(!isDrawing);
      if (e.key.toLowerCase() === 'v') setTransformMode('select');

      // Transforms
      if (e.key.toLowerCase() === 'g' && !(e.metaKey || e.ctrlKey)) setTransformMode('translate');
      if (e.key.toLowerCase() === 'r') setTransformMode('rotate');
      if (e.key.toLowerCase() === 's' && !(e.metaKey || e.ctrlKey)) setTransformMode('scale');
      if (e.key.toLowerCase() === 'm') toggleSnap();

      // Undo/Redo/Copy/Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
         e.preventDefault();
         copy();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
         e.preventDefault();
         paste();
      }

      // Select All (Ctrl+A)
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'a' || e.code === 'KeyA')) {
         e.preventDefault();
         useStore.getState().selectAll();
      }
      
      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
          deleteSelected();
      }

      // Group (Ctrl+G)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
         e.preventDefault();
         if (e.shiftKey) {
             ungroupSelected();
         } else {
             groupSelected();
         }
      }

      // Import/Export/New
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
          e.preventDefault();
          modelInputRef.current?.click();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          triggerExport();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleNewFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, groupSelected, ungroupSelected, copy, paste, addShape, setIsDrawing, isDrawing, setTransformMode, toggleSnap, triggerExport, handleNewFile]);

  const btnClass = "w-10 h-10 rounded-lg hover:bg-slate-50 text-slate-500 transition-all flex items-center justify-center active:scale-95";
  const activeClass = "bg-blue-50 text-blue-600 shadow-inner ring-1 ring-blue-100";
  const separator = <div className="w-8 h-[1px] bg-slate-200 my-1" />;

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl border border-slate-200/60 flex flex-col items-center gap-1 z-20 max-h-[90vh] overflow-y-auto custom-scrollbar">
      
      {/* Creation Tools */}
      <button 
        className={`${btnClass} ${transformMode === 'select' ? activeClass : ''}`}
        onClick={() => setTransformMode('select')}
        title="Select (V)"
      >
        <MousePointer2 size={20} />
      </button>

      <button className={btnClass} onClick={() => addShape('box')} title="Box (1)">
        <Box size={20} />
      </button>
      <button className={btnClass} onClick={() => addShape('sphere')} title="Sphere (2)">
        <Circle size={20} />
      </button>
      <button className={btnClass} onClick={() => addShape('cylinder')} title="Cylinder (3)">
        <Cylinder size={20} />
      </button>
      <button className={btnClass} onClick={() => addShape('tree')} title="Block Tree (4)">
        <Trees size={20} />
      </button>
      
      <button 
        className={`${btnClass} ${isDrawing ? activeClass : ''}`}
        onClick={() => setIsDrawing(!isDrawing)}
        title="Draw Surface (P)"
      >
        <PenTool size={20} />
      </button>

      {separator}
      
      {/* File Operations */}
      <button className={btnClass} onClick={handleNewFile} title="New File (Ctrl+N)">
        <FilePlus size={20} />
      </button>

      <button className={btnClass} onClick={() => modelInputRef.current?.click()} title="Import 3D (Ctrl+O)">
        <FolderOpen size={20} />
      </button>
      <input 
        ref={modelInputRef} 
        type="file" 
        accept=".glb,.gltf" 
        className="hidden" 
        onChange={handleModelUpload} 
      />

      <button className={btnClass} onClick={() => triggerExport()} title="Export 3D (Ctrl+S)">
        <Save size={20} />
      </button>

      <button className={btnClass} onClick={() => fileInputRef.current?.click()} title="Import Image">
        <ImageIcon size={20} />
      </button>
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageUpload} 
      />

      {separator}

      {/* Transform Tools */}
      <button 
        className={`${btnClass} ${transformMode === 'translate' && !isDrawing ? activeClass : ''}`}
        onClick={() => setTransformMode('translate')}
        title="Move (G)"
      >
        <Move size={20} />
      </button>
      <button 
        className={`${btnClass} ${transformMode === 'rotate' && !isDrawing ? activeClass : ''}`}
        onClick={() => setTransformMode('rotate')}
        title="Rotate (R)"
      >
        <RotateCw size={20} />
      </button>
      <button 
        className={`${btnClass} ${transformMode === 'scale' && !isDrawing ? activeClass : ''}`}
        onClick={() => setTransformMode('scale')}
        title="Scale (S)"
      >
        <Scaling size={20} />
      </button>

      {separator}

      {/* History & Modifiers */}
      <button 
        className={`${btnClass} ${history.past.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
        onClick={undo}
        disabled={history.past.length === 0}
        title="Undo (Ctrl+Z)"
      >
        <Undo size={20} />
      </button>
      <button 
        className={`${btnClass} ${history.future.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
        onClick={redo}
        disabled={history.future.length === 0}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo size={20} />
      </button>
      
      <button 
        className={`${btnClass} ${snapEnabled ? activeClass : ''}`}
        onClick={toggleSnap}
        title="Toggle Snap (M)"
      >
        <Magnet size={20} />
      </button>

      <button 
        className={`${btnClass} ${sunSettings.enabled ? activeClass : ''}`}
        onClick={() => {
          if (!sunSettings.enabled && sunSettings.latitude === 40.7128) {
             const coords = prompt("Enter Latitude, Longitude (e.g. 40.7128, -74.0060):", "40.7128, -74.0060");
             if (coords) {
                const [lat, lon] = coords.split(',').map(s => parseFloat(s.trim()));
                if (!isNaN(lat) && !isNaN(lon)) {
                   setSunSettings({ latitude: lat, longitude: lon, enabled: true });
                   return;
                }
             }
          }
          setSunSettings({ enabled: !sunSettings.enabled });
        }}
        title="Sun & Shadows"
      >
        <Sun size={20} />
      </button>
      
      {selectedIds.length > 0 && (
        <button 
          className={`${btnClass} text-red-500 hover:bg-red-50 hover:text-red-600`}
          onClick={deleteSelected}
          title="Delete (Del)"
        >
          <Trash2 size={20} />
        </button>
      )}
    </div>
  );
};
