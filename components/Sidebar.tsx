
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { getDateFromDayOfYear, getSunPosition, toDeg, toRad } from '../utils/solar';
import { ShapeData } from '../types';
import { 
  Layers, Box, Settings, Eye, EyeOff, Lock, Unlock, Sun, ChevronDown, ChevronRight,
  type LucideIcon,
} from 'lucide-react';

// --- COLLAPSIBLE SECTION COMPONENT ---
interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon: Icon, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex-none border-b border-slate-200">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="py-1">
          {children}
        </div>
      )}
    </div>
  );
};

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
  onSnapshot?: () => void;
  label?: string;
  step?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, onSnapshot, label, step = "0.1" }) => {
  const [strVal, setStrVal] = useState(Number(value).toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

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
    const num = parseFloat(strVal);
    if (!isNaN(num)) {
      setStrVal(num.toFixed(2));
    } else {
      setStrVal(Number(value).toFixed(2));
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onSnapshot) onSnapshot();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    e.stopPropagation(); 
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
    e.stopPropagation(); 
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

// --- RECURSIVE LAYER ITEM ---
interface LayerItemProps {
  shape: ShapeData;
  depth?: number;
}

const LayerItem: React.FC<LayerItemProps> = ({ shape, depth = 0 }) => {
  const { selectedIds, selectShape, toggleShapeVisibility, toggleShapeLock, shapes, updateShape, toggleGroupCollapse, snapshot } = useStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(shape.name);

  const isSelected = selectedIds.includes(shape.id);
  const isGroup = shape.type === 'group';
  const children = shapes.filter(s => s.parentId === shape.id);
  
  const handleRename = () => {
     if (nameVal.trim() !== "") {
        snapshot();
        updateShape(shape.id, { name: nameVal });
     } else {
        setNameVal(shape.name);
     }
     setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter') handleRename();
     if (e.key === 'Escape') {
         setNameVal(shape.name);
         setIsRenaming(false);
     }
     e.stopPropagation();
  };

  return (
    <>
      <div 
        onClick={(e) => {
           e.stopPropagation();
           selectShape(shape.id, e.ctrlKey || e.metaKey || e.shiftKey);
        }}
        className={`group flex items-center gap-2 pr-3 py-1.5 text-xs cursor-pointer select-none transition-colors border-l-2 ${isSelected ? 'bg-blue-50 text-blue-700 font-medium border-blue-500' : 'text-slate-600 hover:bg-slate-50 border-transparent'}`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {/* Expand/Collapse for Groups */}
        {isGroup ? (
           <button 
             onClick={(e) => { e.stopPropagation(); toggleGroupCollapse(shape.id); }}
             className="p-0.5 text-slate-400 hover:text-slate-600"
           >
             {shape.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
           </button>
        ) : (
           <div className="w-4" /> 
        )}

        {/* Renaming Input or Name Label */}
        {isRenaming ? (
           <input 
             type="text" 
             value={nameVal}
             autoFocus
             onChange={(e) => setNameVal(e.target.value)}
             onBlur={handleRename}
             onKeyDown={handleKeyDown}
             onClick={(e) => e.stopPropagation()}
             className="flex-1 min-w-0 bg-white border border-blue-300 rounded px-1 outline-none text-xs"
           />
        ) : (
           <span 
             onDoubleClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
             className={`flex-1 truncate ${shape.locked ? 'opacity-70 italic' : ''}`}
           >
             {shape.name}
           </span>
        )}

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
           <button 
             onClick={(e) => { e.stopPropagation(); toggleShapeLock(shape.id); }}
             className={`p-0.5 rounded ${!shape.locked ? 'text-slate-300 hover:text-slate-500' : 'text-orange-400 opacity-100'}`}
             title={shape.locked ? "Unlock" : "Lock"}
           >
             {shape.locked ? <Lock size={12} /> : <Unlock size={12} />}
           </button>
           
           <button 
             onClick={(e) => { e.stopPropagation(); toggleShapeVisibility(shape.id); }}
             className={`p-0.5 rounded ${shape.visible ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300'}`}
             title={shape.visible ? "Hide" : "Show"}
           >
             {shape.visible ? <Eye size={12} /> : <EyeOff size={12} />}
           </button>
        </div>
      </div>

      {/* Render Children Recursively */}
      {isGroup && !shape.collapsed && children.map(child => (
         <LayerItem key={child.id} shape={child} depth={depth + 1} />
      ))}
    </>
  );
};

export const Sidebar: React.FC = () => {
  const { 
    shapes, selectedIds, updateShape,
    backgroundColor, setBackgroundColor,
    snapGrid, setSnapGrid,
    gridVisible, setGridVisible,
    gridSpacing, setGridSpacing,
    gridColor, setGridColor,
    gridSectionColor, setGridSectionColor,
    objectSnapEnabled, toggleObjectSnap,
    sunSettings, setSunSettings,
    snapshot
  } = useStore();

  const selectedShape = selectedIds.length === 1 ? shapes.find(s => s.id === selectedIds[0]) : null;
  const isMultiSelect = selectedIds.length > 1;

  // Helper for Dimensions (Scale)
  const handleDimensionChange = (axis: number, value: number) => {
    if (!selectedShape) return;
    const newScale = [...selectedShape.scale] as [number, number, number];
    newScale[axis] = value;
    updateShape(selectedShape.id, { scale: newScale });
  };
  
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const handleRotationChange = (axis: number, degValue: number) => {
    if (!selectedShape) return;
    const newRot = [...selectedShape.rotation] as [number, number, number];
    newRot[axis] = toRadians(degValue);
    updateShape(selectedShape.id, { rotation: newRot });
  };

  // --- SOLAR DATA CALCULATION ---
  const solarData = useMemo(() => {
    if (!sunSettings.enabled) return null;
    const tzOffset = Math.round(sunSettings.longitude / 15);
    const utcTime = sunSettings.time - tzOffset;
    const pos = getSunPosition(sunSettings.latitude, sunSettings.longitude, sunSettings.date, utcTime);
    
    const latRad = toRad(sunSettings.latitude);
    const decRad = toRad(pos.declination);
    const cosW = -Math.tan(latRad) * Math.tan(decRad);
    let sunsetHour = 12, sunriseHour = 6, dayLength = 12;

    if (Math.abs(cosW) <= 1) {
       const wRad = Math.acos(cosW);
       const wDeg = toDeg(wRad);
       const hours = wDeg / 15;
       sunsetHour = 12 + hours;
       sunriseHour = 12 - hours;
       dayLength = 2 * hours;
    }
    
    return {
      alt: toDeg(pos.altitude).toFixed(1),
      az: toDeg(pos.azimuth).toFixed(1),
      tzString: `UTC${tzOffset >= 0 ? '+' : ''}${tzOffset}`,
      sunrise: `${Math.floor(sunriseHour)}:${Math.round((sunriseHour%1)*60).toString().padStart(2,'0')}`,
      sunset: `${Math.floor(sunsetHour)}:${Math.round((sunsetHour%1)*60).toString().padStart(2,'0')}`,
      dayLength: dayLength.toFixed(1)
    };
  }, [sunSettings]);

  return (
    <div className="absolute top-4 right-4 bottom-4 w-64 bg-white/95 backdrop-blur-xl rounded-lg shadow-xl border border-slate-200/60 overflow-hidden flex flex-col z-20 transition-all custom-scrollbar">
      
      {/* --- SCENE SETTINGS --- */}
      <CollapsibleSection title="Scene" icon={Settings}>
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
      </CollapsibleSection>

       {/* --- ENVIRONMENT / SUN --- */}
       <CollapsibleSection title="Environment" icon={Sun} defaultOpen={false}>
          <PropertyRow label="Enable Sun">
             <input type="checkbox" checked={sunSettings.enabled} onChange={(e) => setSunSettings({ enabled: e.target.checked })} className="accent-blue-600 h-3.5 w-3.5" />
          </PropertyRow>
          
          {sunSettings.enabled && (
            <>
              <PropertyRow label="Show Path">
                <input type="checkbox" checked={sunSettings.showPath} onChange={(e) => setSunSettings({ showPath: e.target.checked })} className="accent-blue-600 h-3.5 w-3.5" />
              </PropertyRow>
              <PropertyRow label="Diagram Scale">
                <div className="flex items-center gap-2 w-full justify-end">
                  <input type="range" min="10" max="100" step="5" value={sunSettings.radius} onChange={(e) => setSunSettings({ radius: parseInt(e.target.value) })} className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
              </PropertyRow>
              
              <div className="h-[1px] bg-slate-100 my-2 mx-4" />

              <PropertyRow label="Sun Color">
                 <ColorInput value={sunSettings.sunColor} onChange={(c) => setSunSettings({ sunColor: c })} onSnapshot={()=>{}} />
              </PropertyRow>
              <PropertyRow label="Path Color">
                 <ColorInput value={sunSettings.pathColor} onChange={(c) => setSunSettings({ pathColor: c })} onSnapshot={()=>{}} />
              </PropertyRow>
              <PropertyRow label="Shadow Color">
                 <ColorInput value={sunSettings.shadowColor} onChange={(c) => setSunSettings({ shadowColor: c })} onSnapshot={()=>{}} />
              </PropertyRow>
              
              <div className="h-[1px] bg-slate-100 my-2 mx-4" />

              <PropertyRow label="Latitude">
                <NumberInput value={sunSettings.latitude} step="0.01" onChange={(v) => setSunSettings({ latitude: v })} />
              </PropertyRow>
              <PropertyRow label="Longitude">
                <NumberInput value={sunSettings.longitude} step="0.01" onChange={(v) => setSunSettings({ longitude: v })} />
              </PropertyRow>
              
              {/* Date Slider */}
              <div className="px-4 py-2">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium text-slate-500">Date</span>
                    <span className="text-[10px] font-bold text-slate-700">
                       {getDateFromDayOfYear(sunSettings.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                 </div>
                 <input 
                   type="range" min="1" max="365" step="1"
                   value={sunSettings.date}
                   onChange={(e) => setSunSettings({ date: parseInt(e.target.value) })}
                   className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                 />
              </div>

               {/* Time Slider */}
               <div className="px-4 py-2 pb-3">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium text-slate-500">Local Time</span>
                    <span className="text-[10px] font-bold text-slate-700">
                        {Math.floor(sunSettings.time)}:{(Math.round((sunSettings.time % 1) * 60)).toString().padStart(2, '0')}
                        {solarData && <span className="text-slate-400 font-normal ml-1">({solarData.tzString})</span>}
                    </span>
                 </div>
                 <input 
                   type="range" min="0" max="24" step="0.25" 
                   value={sunSettings.time}
                   onChange={(e) => setSunSettings({ time: parseFloat(e.target.value) })}
                   className="w-full h-1 bg-gradient-to-r from-slate-900 via-orange-300 to-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                 />
              </div>

              {/* --- SOLAR ANALYSIS - FLATTENED --- */}
              {solarData && (
                <div className="pt-2 mt-2 border-t border-slate-100">
                   <PropertyRow label="Azimuth">
                      <span className="text-xs font-mono font-semibold text-slate-700">{solarData.az}°</span>
                   </PropertyRow>
                   <PropertyRow label="Altitude">
                      <span className="text-xs font-mono font-semibold text-slate-700">{solarData.alt}°</span>
                   </PropertyRow>
                   <PropertyRow label="Sunrise">
                      <span className="text-xs font-semibold text-slate-700">{solarData.sunrise}</span>
                   </PropertyRow>
                   <PropertyRow label="Sunset">
                      <span className="text-xs font-semibold text-slate-700">{solarData.sunset}</span>
                   </PropertyRow>
                   <PropertyRow label="Day Length">
                      <span className="text-xs font-semibold text-slate-700">{solarData.dayLength}h</span>
                   </PropertyRow>
                </div>
              )}
            </>
          )}
      </CollapsibleSection>

      {/* --- SELECTED OBJECT PROPERTIES --- */}
      <CollapsibleSection title="Properties" icon={Box}>
        {selectedShape ? (
          <div className={`py-2 ${selectedShape.locked ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Name Input */}
            <div className="px-4 mb-3">
              <input 
                type="text" 
                value={selectedShape.name}
                onFocus={snapshot}
                onKeyDown={(e) => e.stopPropagation()} 
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
                    onPointerDown={snapshot} 
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
          <div className="h-24 flex flex-col items-center justify-center text-slate-400 text-xs">
            {isMultiSelect ? (
              <>
                 <Layers size={24} className="mb-2 opacity-20" />
                 <p>{selectedIds.length} items selected</p>
              </>
            ) : (
              <>
                <Box size={24} className="mb-2 opacity-20" />
                <p>No selection</p>
              </>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* --- LAYERS --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
        <CollapsibleSection title="Layers" icon={Layers}>
          <div className="p-1">
            {shapes.length === 0 ? (
              <p className="text-center text-[10px] text-slate-400 mt-4 italic">Empty scene</p>
            ) : (
              <div className="space-y-[1px]">
                {/* Only render top-level items here; recursion handles the rest */}
                {shapes.filter(s => !s.parentId).map(shape => (
                  <LayerItem key={shape.id} shape={shape} />
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

    </div>
  );
};
