
import React from 'react';
import { useStore } from '../store';
import { BoxSelect } from 'lucide-react';

export const ViewControls: React.FC = () => {
    const { requestCameraView } = useStore();

    const btnClass = "w-10 h-8 flex items-center justify-center text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors rounded bg-white border border-slate-200 uppercase";
    
    return (
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
            {/* Quick Presets */}
            <div className="flex gap-1">
                <button className={`${btnClass} w-auto px-3`} onClick={() => requestCameraView('iso')}>ISO</button>
                <button className={`${btnClass} w-auto px-3`} onClick={() => requestCameraView('axo')}>AXO</button>
            </div>

            {/* Ortho Cube Unwrapped */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-white/50 backdrop-blur rounded-lg border border-slate-200/50 shadow-sm">
                <div />
                <button className={btnClass} onClick={() => requestCameraView('top')} title="Top">TOP</button>
                <div />
                
                <button className={btnClass} onClick={() => requestCameraView('left')} title="Left">LFT</button>
                <button className={btnClass} onClick={() => requestCameraView('front')} title="Front">FRT</button>
                <button className={btnClass} onClick={() => requestCameraView('right')} title="Right">RGT</button>
                
                <div />
                <button className={btnClass} onClick={() => requestCameraView('bottom')} title="Bottom">BTM</button>
                <button className={btnClass} onClick={() => requestCameraView('back')} title="Back">BCK</button>
            </div>
        </div>
    );
};
