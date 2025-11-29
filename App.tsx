
import React from 'react';
import { EditorScene } from './components/EditorScene';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { ViewControls } from './components/ViewControls';

function App() {
  return (
    <div className="w-full h-[100dvh] relative flex flex-col overflow-hidden bg-slate-100">
      {/* 3D Canvas Area */}
      <div className="flex-1 relative w-full h-full">
        <EditorScene />
        
        {/* Overlays - Wrapped to ensure z-index stacking context */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {/* Top Toolbar */}
          <div className="pointer-events-auto">
             <Toolbar />
          </div>
          
          {/* Right Sidebar */}
          <div className="pointer-events-auto">
             <Sidebar />
          </div>

          {/* Bottom Left View Controls */}
          <div className="pointer-events-auto">
             <ViewControls />
          </div>

          {/* Branding */}
          <div className="absolute bottom-4 right-1/2 translate-x-1/2 md:right-auto md:translate-x-0 md:left-4 pointer-events-none opacity-50 z-0">
            <h1 className="text-xl font-bold text-slate-900">ArchMass</h1>
            <p className="text-xs text-slate-600">Schematic Editor</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
