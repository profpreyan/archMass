
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Layers, Box, Settings, Eye, EyeOff, Lock, Unlock,
  type LucideIcon,
} from 'lucide-react';

// Design System Components
interface PanelHeaderProps {
  title: string;
  icon: LucideIcon;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
    <Icon size={14} className="text-slate-500" />
    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</span>
  </div>
);

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

const PropertyRow: React.FC<PropertyRowProps> = ({ label, children }) => (
  <div className="flex items-center justify-between py-1.5 px-4 hover:bg-slate-50 transition-colors">
    <label className="text-[11px] text-slate-500 font-medium w-24 truncate" title={label}>{label}</label>
    <div className="flex-1 flex justify-end">
      {children}
    </div>
  </div>
);

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  onSnapshot: () => void;
  label?: string;
  step?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, onSnapshot, label, step = "0.1" }) => {
  const [strVal, setStrVal] = useState(Number(value).toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

  // Sync with prop value only when not focused to avoid overwriting user typing
  useEffect(() => {
    if (!isFocused) {
      setStrVal(Number(value).toFixed(2));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStrVal(e.target.value);
    const num = parseFloat(e.target.value);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // On blur, format to ensure consistency
    const num = parseFloat(strVal);
    if (!isNaN(num)) {
      setStrVal(num.toFixed(2));
    } else {
      setStrVal(Number(value).toFixed(2)); // Revert if invalid
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onSnapshot();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    e.stopPropagation(); // Stop event bubbling to prevent OrbitControls/App listeners from interfering
  };

  return (
    <div className="flex items-center bg-white border border-slate-200 rounded hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20 transition-all w-full max-w-[80px]">
      {label && <span className="text-[9px] text-slate-400 pl-1.5 font-bold cursor-default select-none">{label}</span>}
      <input 
        type="number" 
        step={step}
        value={strVal}
        onFocus={handleFocus} 
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-right text-[11px] px-1 py-1 outline-none text-slate-700 font-medium"
      />
    </div>
  );
};

interface ColorInputProps {
  value: string;
  onChange: (v: string) => void;
  onSnapshot: () => void;
}

const ColorInput: React.FC<ColorInputProps> = ({ value, onChange, onSnapshot }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
      onChange(e.target.value);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Allow typing in color input
  };

  return (
    <div className="flex items-center gap-2 w-full justify-end">
      <input 
        type="text" 
        value={localValue}
        onFocus={onSnapshot}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        className="w-16 text-[10px] font-mono border border-slate-200 rounded px-1 py-0.5 text-slate-700 bg-white uppercase focus:border-blue-400 outline-none"
      />
      <div 
        className="relative w-6 h-6 rounded border border-slate-200 overflow-hidden shadow-sm hover:scale-105 transition-transform cursor-pointer"
        style={{ backgroundColor: value }}
        onPointerDown={onSnapshot}
      >
        <input 
          type="color" 
          value={value}
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange(e.target.value);
          }}
          className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 opacity-0 cursor-pointer p-0 m-0"
        />
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { 
    shapes, selectedId, selectShape, updateShape, toggleShapeVisibility, toggleShapeLock,
    backgroundColor, setBackgroundColor,
    snapGrid, setSnapGrid,
    gridVisible, setGridVisible,
    gridSpacing, setGridSpacing,
    gridColor, setGridColor,
    gridSectionColor, setGridSectionColor,
    objectSnapEnabled, toggleObjectSnap,
    snapshot // Get snapshot action
  } = useStore();

  const selectedShape = shapes.find(s => s.id === selectedId);

  // Helper for Dimensions (Scale)
  const handleDimensionChange = (axis: number, value: number) => {
    if (!selectedShape) return;
    const newScale = [...selectedShape.scale] as [number, number, number];
    newScale[axis] = value;
    updateShape(selectedShape.id, { scale: newScale });
  };
  
  // Helper for Rotation (Degrees <-> Radians)
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const handleRotationChange = (axis: number, degValue: number) => {
    if (!selectedShape) return;
    const newRot = [...selectedShape.rotation] as [number, number, number];
    newRot[axis] = toRadians(degValue);
    updateShape(selectedShape.id, { rotation: newRot });
  };

  return (
    <div className="absolute top-4 right-4 bottom-4 w-64 bg-white/95 backdrop-blur-xl rounded-lg shadow-xl border border-slate-200/60 overflow-hidden flex flex-col z-20 transition-all">
      
      {/* --- SCENE SETTINGS --- */}
      <div className="flex-none border-b border-slate-200">
        <PanelHeader title="Scene" icon={Settings} />
        <div className="py-1">
          <PropertyRow label="Background">
            <ColorInput value={backgroundColor} onChange={setBackgroundColor} onSnapshot={()=>{}} />
          </PropertyRow>
          <PropertyRow label="Grid Visible">
             <input type="checkbox" checked={gridVisible} onChange={(e) => setGridVisible(e.target.checked)} className="accent-blue-600 h-3.5 w-3.5" />
          </PropertyRow>
          <PropertyRow label="Grid Size">
            <NumberInput value={gridSpacing} onChange={setGridSpacing} onSnapshot={()=>{}} />
          </PropertyRow>
          <PropertyRow label="Grid Color">
             <div className="flex gap-2">
                <ColorInput value={gridColor} onChange={setGridColor} onSnapshot={()=>{}} />
                <ColorInput value={gridSectionColor} onChange={setGridSectionColor} onSnapshot={()=>{}} />
             </div>
          </PropertyRow>
          
          <div className="h-[1px] bg-slate-100 my-1 mx-4" />

          <PropertyRow label="Snap Grid">
            <div className="flex items-center gap-2 w-full justify-end">
              <input type="range" min="0.1" max="5" step="0.1" value={snapGrid} onChange={(e) => setSnapGrid(parseFloat(e.target.value))} className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              <span className="text-[10px] text-slate-500 w-8 text-right">{snapGrid}m</span>
            </div>
          </PropertyRow>
          <PropertyRow label="Object Snap">
             <input type="checkbox" checked={objectSnapEnabled} onChange={toggleObjectSnap} className="accent-blue-600 h-3.5 w-3.5" />
          </PropertyRow>
        </div>
      </div>

      {/* --- SELECTED OBJECT PROPERTIES --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar border-b border-slate-200">
        <PanelHeader title="Properties" icon={Box} />
        
        {selectedShape ? (
          <div className={`py-2 ${selectedShape.locked ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Name Input */}
            <div className="px-4 mb-3">
              <input 
                type="text" 
                value={selectedShape.name}
                onFocus={snapshot}
                onKeyDown={(e) => e.stopPropagation()} // Stop propagation
                onChange={(e) => updateShape(selectedShape.id, { name: e.target.value })}
                className="w-full text-sm font-semibold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none pb-1 placeholder-slate-400"
                placeholder="Object Name"
              />
            </div>

            {/* Transform Group */}
            <div className="px-4 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Transform</span>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <NumberInput 
                    key={`pos-${axis}`} 
                    label={axis} 
                    value={selectedShape.position[i]}
                    onSnapshot={snapshot}
                    onChange={(v) => {
                      const p = [...selectedShape.position] as [number, number, number];
                      p[i] = v;
                      updateShape(selectedShape.id, { position: p });
                    }} 
                  />
                ))}
              </div>
            </div>
            
            {/* Rotation Group */}
            <div className="px-4 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Rotation (Deg)</span>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <NumberInput 
                    key={`rot-${axis}`} 
                    label={axis} 
                    value={toDegrees(selectedShape.rotation[i])}
                    onSnapshot={snapshot}
                    onChange={(v) => handleRotationChange(i, v)} 
                  />
                ))}
              </div>
            </div>

            {/* Dimensions Group */}
            <div className="px-4 mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Dimensions</span>
              <div className="grid grid-cols-3 gap-1.5">
                <NumberInput label="W" value={selectedShape.scale[0]} onSnapshot={snapshot} onChange={(v) => handleDimensionChange(0, v)} />
                <NumberInput label="H" value={selectedShape.scale[1]} onSnapshot={snapshot} onChange={(v) => handleDimensionChange(1, v)} />
                <NumberInput label="D" value={selectedShape.scale[2]} onSnapshot={snapshot} onChange={(v) => handleDimensionChange(2, v)} />
              </div>
              {selectedShape.type === 'custom' && (
                <div className="mt-2">
                  <NumberInput 
                    label="Extrude" 
                    value={selectedShape.extrudeDepth || 0}
                    onSnapshot={snapshot}
                    onChange={(v) => updateShape(selectedShape.id, { extrudeDepth: v })} 
                  />
                </div>
              )}
            </div>

            {/* Style Group */}
            <div className="border-t border-slate-100 mt-2 pt-2">
              <PropertyRow label={selectedShape.type === 'tree' ? "Foliage Color" : "Color"}>
                <ColorInput value={selectedShape.color} onSnapshot={snapshot} onChange={(c) => updateShape(selectedShape.id, { color: c })} />
              </PropertyRow>

              {/* Trunk Color for Trees */}
              {selectedShape.type === 'tree' && (
                <PropertyRow label="Trunk Color">
                  <ColorInput 
                    value={selectedShape.secondaryColor || '#5d4037'} 
                    onSnapshot={snapshot}
                    onChange={(c) => updateShape(selectedShape.id, { secondaryColor: c })} 
                  />
                </PropertyRow>
              )}
              
              <PropertyRow label="Opacity">
                 <div className="flex items-center gap-2 w-full justify-end">
                  <input 
                    type="range" min="0" max="1" step="0.1" 
                    value={selectedShape.opacity}
                    onPointerDown={snapshot} // Snapshot on drag start
                    onChange={(e) => updateShape(selectedShape.id, { opacity: parseFloat(e.target.value) })}
                    className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                  />
                  <span className="text-[10px] text-slate-500 w-8 text-right">{Math.round(selectedShape.opacity * 100)}%</span>
                </div>
              </PropertyRow>

              <PropertyRow label="Wireframe">
                <input type="checkbox" checked={selectedShape.wireframe} onChange={(e) => { snapshot(); updateShape(selectedShape.id, { wireframe: e.target.checked }); }} className="accent-blue-600 h-3.5 w-3.5" />
              </PropertyRow>
              
              <PropertyRow label="Show Edges">
                <input type="checkbox" checked={selectedShape.edges} onChange={(e) => { snapshot(); updateShape(selectedShape.id, { edges: e.target.checked }); }} className="accent-blue-600 h-3.5 w-3.5" />
              </PropertyRow>

              {selectedShape.edges && (
                <PropertyRow label="Edge Color">
                  <ColorInput value={selectedShape.edgeColor} onSnapshot={snapshot} onChange={(c) => updateShape(selectedShape.id, { edgeColor: c })} />
                </PropertyRow>
              )}
            </div>

          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Box size={24} className="mb-2 opacity-20" />
            <p>No selection</p>
          </div>
        )}
      </div>

      {/* --- LAYERS --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-[150px]">
        <PanelHeader title="Layers" icon={Layers} />
        <div className="flex-1 p-1">
          {shapes.length === 0 ? (
            <p className="text-center text-[10px] text-slate-400 mt-4 italic">Empty scene</p>
          ) : (
            <div className="space-y-[1px]">
              {shapes.map(shape => (
                <div 
                  key={shape.id}
                  onClick={() => selectShape(shape.id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded text-xs cursor-pointer select-none transition-colors ${selectedId === shape.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleShapeVisibility(shape.id); }}
                    className={`p-0.5 rounded ${shape.visible ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300'}`}
                    title={shape.visible ? "Hide" : "Show"}
                  >
                    {shape.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>

                   <button 
                    onClick={(e) => { e.stopPropagation(); toggleShapeLock(shape.id); }}
                    className={`p-0.5 rounded ${!shape.locked ? 'text-slate-300 hover:text-slate-500' : 'text-orange-400'}`}
                    title={shape.locked ? "Unlock" : "Lock"}
                  >
                    {shape.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  
                  <span className={`flex-1 truncate ${shape.locked ? 'opacity-70 italic' : ''}`}>{shape.name}</span>
                  
                  {/* Indicator for type */}
                  <span className="text-[9px] uppercase text-slate-300 font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                    {shape.type.slice(0,3)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
