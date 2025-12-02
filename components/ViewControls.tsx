
import React from 'react';
import { useStore } from '../store';

export const ViewControls: React.FC = () => {
    const { requestCameraView } = useStore();

    const btnClass = "h-8 px-2 flex items-center justify-center text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors rounded bg-white border border-slate-200 uppercase min-w-[36px]";
    
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 bg-white/95 backdrop-blur-xl rounded-xl border border-slate-200/60 shadow-lg">
            {/* Quick Presets */}
            <div className="flex gap-1 border-r border-slate-200 pr-2">
                <button className={btnClass} onClick={() => requestCameraView('iso')}>ISO</button>
                <button className={btnClass} onClick={() => requestCameraView('axo')}>AXO</button>
            </div>

            {/* Ortho Views */}
            <div className="flex gap-1">
                <button className={btnClass} onClick={() => requestCameraView('top')} title="Top">TOP</button>
                <button className={btnClass} onClick={() => requestCameraView('bottom')} title="Bottom">BTM</button>
                <button className={btnClass} onClick={() => requestCameraView('front')} title="Front">FRT</button>
                <button className={btnClass} onClick={() => requestCameraView('back')} title="Back">BCK</button>
                <button className={btnClass} onClick={() => requestCameraView('left')} title="Left">LFT</button>
                <button className={btnClass} onClick={() => requestCameraView('right')} title="Right">RGT</button>
            </div>
        </div>
    );
};
