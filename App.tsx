
import React from 'react';
import { EditorScene } from './components/EditorScene';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { ViewControls } from './components/ViewControls';
import { useStore } from './store';
import { Eye, EyeOff } from 'lucide-react';

function App() {
  const { uiVisible, toggleUi } = useStore();

  return (
    <div className="w-full h-[100dvh] relative flex flex-col overflow-hidden bg-slate-100">
      {/* 3D Canvas Area */}
      <div className="flex-1 relative w-full h-full">
        <EditorScene />
        
        {/* UI Toggle Button (Always Visible) */}
        <button 
          onClick={toggleUi}
          className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center bg-white/50 hover:bg-white backdrop-blur rounded-full shadow-sm text-slate-500 hover:text-slate-800 transition-all"
          title={uiVisible ? "Hide UI" : "Show UI"}
        >
          {uiVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>

        {/* Overlays - Conditional Rendering */}
        <div className={`absolute inset-0 pointer-events-none z-10 overflow-hidden transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Left Toolbar (Vertical) */}
          <div className="pointer-events-auto">
             <Toolbar />
          </div>
          
          {/* Right Sidebar */}
          <div className="pointer-events-auto">
             <Sidebar />
          </div>

          {/* Bottom Center View Controls (Horizontal) */}
          <div className="pointer-events-auto">
             <ViewControls />
          </div>

          {/* Branding */}
          <div className="absolute bottom-4 right-4 pointer-events-none opacity-50 z-0 text-right">
            <h1 className="text-xl font-bold text-slate-900 leading-none">ArchMass</h1>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Schematic Editor</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
