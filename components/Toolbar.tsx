
import React, { useRef, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Box, Circle, Cylinder, Cone, Square, 
  Move, RotateCw, Scaling, Trash2, 
  Magnet, PenTool, Trees, ArrowUpFromLine,
  Image as ImageIcon, Undo, Redo
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { 
    addShape, transformMode, setTransformMode, 
    snapEnabled, toggleSnap, deleteSelected, selectedId,
    isDrawing, setIsDrawing,
    undo, redo, history
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Reset input
    if (e.target) e.target.value = '';
  };

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
           redo();
        } else {
           undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const btnClass = "w-12 h-12 rounded-lg hover:bg-slate-50 text-slate-500 transition-all flex flex-col items-center justify-center gap-1 active:scale-95";
  const activeClass = "bg-blue-50 text-blue-600 shadow-inner ring-1 ring-blue-100";
  const separator = <div className="w-[1px] h-8 bg-slate-200 mx-1" />;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl border border-slate-200/60 flex items-center gap-1 z-20 max-w-[95vw] overflow-x-auto custom-scrollbar">
      
      {/* Creation Tools */}
      <button className={btnClass} onClick={() => addShape('box')} title="Box">
        <Box size={18} />
        <span className="text-[9px] font-medium">Box</span>
      </button>
      <button className={btnClass} onClick={() => addShape('sphere')} title="Sphere">
        <Circle size={18} />
        <span className="text-[9px] font-medium">Sphere</span>
      </button>
      <button className={btnClass} onClick={() => addShape('cylinder')} title="Cyl">
        <Cylinder size={18} />
        <span className="text-[9px] font-medium">Cyl</span>
      </button>
      <button className={btnClass} onClick={() => addShape('tree')} title="Block Tree">
        <Trees size={18} />
        <span className="text-[9px] font-medium">Tree</span>
      </button>
      
      <button className={btnClass} onClick={() => fileInputRef.current?.click()} title="Import Image">
        <ImageIcon size={18} />
        <span className="text-[9px] font-medium">Img</span>
      </button>
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageUpload} 
      />

      <button 
        className={`${btnClass} ${isDrawing ? activeClass : ''}`}
        onClick={() => setIsDrawing(!isDrawing)}
        title="Draw Surface (Pen)"
      >
        <PenTool size={18} />
        <span className="text-[9px] font-medium">Pen</span>
      </button>

      {separator}

      {/* Transform Tools */}
      <button 
        className={`${btnClass} ${transformMode === 'translate' && !isDrawing ? activeClass : ''}`}
        onClick={() => setTransformMode('translate')}
        title="Move (G)"
      >
        <Move size={18} />
        <span className="text-[9px] font-medium">Move</span>
      </button>
      <button 
        className={`${btnClass} ${transformMode === 'rotate' && !isDrawing ? activeClass : ''}`}
        onClick={() => setTransformMode('rotate')}
        title="Rotate (R)"
      >
        <RotateCw size={18} />
        <span className="text-[9px] font-medium">Rotate</span>
      </button>
      <button 
        className={`${btnClass} ${transformMode === 'scale' && !isDrawing ? activeClass : ''}`}
        onClick={() => setTransformMode('scale')}
        title="Scale (S)"
      >
        <Scaling size={18} />
        <span className="text-[9px] font-medium">Scale</span>
      </button>
      <button 
        className={`${btnClass} ${transformMode === 'pushpull' && !isDrawing ? activeClass : ''}`}
        onClick={() => setTransformMode('pushpull')}
        title="Push/Pull (P)"
      >
        <ArrowUpFromLine size={18} />
        <span className="text-[9px] font-medium">Push</span>
      </button>

      {separator}

      {/* History & Modifiers */}
      <button 
        className={`${btnClass} ${history.past.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
        onClick={undo}
        disabled={history.past.length === 0}
        title="Undo (Ctrl+Z)"
      >
        <Undo size={18} />
        <span className="text-[9px] font-medium">Undo</span>
      </button>
      <button 
        className={`${btnClass} ${history.future.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
        onClick={redo}
        disabled={history.future.length === 0}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo size={18} />
        <span className="text-[9px] font-medium">Redo</span>
      </button>
      
      <button 
        className={`${btnClass} ${snapEnabled ? activeClass : ''}`}
        onClick={toggleSnap}
        title="Toggle Snap"
      >
        <Magnet size={18} />
        <span className="text-[9px] font-medium">Snap</span>
      </button>
      
      {selectedId && (
        <button 
          className={`${btnClass} text-red-500 hover:bg-red-50 hover:text-red-600`}
          onClick={deleteSelected}
          title="Delete"
        >
          <Trash2 size={18} />
          <span className="text-[9px] font-medium">Del</span>
        </button>
      )}
    </div>
  );
};
