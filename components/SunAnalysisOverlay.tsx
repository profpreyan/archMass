
import React, { useMemo } from 'react';
import { useStore } from '../store';
import { getSunPosition, toDeg, toRad } from '../utils/solar';
import { Sun, Sunrise, Sunset, Clock, Globe } from 'lucide-react';

export const SunAnalysisOverlay: React.FC = () => {
  const { sunSettings } = useStore();
  
  const data = useMemo(() => {
    if (!sunSettings.enabled) return null;

    // Calculate approximate Timezone Offset based on Longitude (15 deg per hour)
    const tzOffset = Math.round(sunSettings.longitude / 15);
    // UTC = Local Time - TZ Offset
    const utcTime = sunSettings.time - tzOffset;
    
    const pos = getSunPosition(sunSettings.latitude, sunSettings.longitude, sunSettings.date, utcTime);
    
    // Day length calculation
    const latRad = toRad(sunSettings.latitude);
    const decRad = toRad(pos.declination);
    // Hour angle at sunset: cos(w) = -tan(phi)tan(delta)
    const cosW = -Math.tan(latRad) * Math.tan(decRad);
    let sunsetHour = 12; 
    let sunriseHour = 6;
    let dayLength = 12;

    if (Math.abs(cosW) <= 1) {
       const wRad = Math.acos(cosW);
       const wDeg = toDeg(wRad);
       const hours = wDeg / 15;
       sunsetHour = 12 + hours;
       sunriseHour = 12 - hours;
       dayLength = 2 * hours;
    } else if (cosW > 1) {
        // Polar night
        dayLength = 0;
        sunriseHour = 0; 
        sunsetHour = 0;
    } else {
        // Midnight sun
        dayLength = 24;
        sunriseHour = 0; 
        sunsetHour = 24;
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

  if (!sunSettings.enabled || !data) return null;

  return (
    <div className="absolute top-4 left-4 p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/60 w-64 pointer-events-auto transition-all z-20">
       
       {/* Header */}
       <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
          <Sun className="text-amber-500" size={18} />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Solar Analysis</span>
       </div>

       {/* Grid Data */}
       <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          
          <div className="flex flex-col">
             <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
               <Clock size={10} /> Local Time
             </span>
             <span className="text-sm font-semibold text-slate-700">
                {Math.floor(sunSettings.time)}:{(Math.round((sunSettings.time % 1) * 60)).toString().padStart(2, '0')}
                <span className="text-[10px] text-slate-400 ml-1 font-normal">({data.tzString})</span>
             </span>
          </div>

          <div className="flex flex-col">
             <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
               <Globe size={10} /> Location
             </span>
             <span className="text-xs font-medium text-slate-600 truncate" title={`${sunSettings.latitude}, ${sunSettings.longitude}`}>
               {sunSettings.latitude.toFixed(1)}°, {sunSettings.longitude.toFixed(1)}°
             </span>
          </div>

          <div className="flex flex-col">
             <span className="text-[9px] font-bold text-slate-400 uppercase">Azimuth</span>
             <span className="text-sm font-mono font-semibold text-slate-700">{data.az}°</span>
          </div>
          
          <div className="flex flex-col">
             <span className="text-[9px] font-bold text-slate-400 uppercase">Altitude</span>
             <span className="text-sm font-mono font-semibold text-slate-700">{data.alt}°</span>
          </div>

          <div className="col-span-2 grid grid-cols-3 bg-slate-50 rounded-lg p-2 mt-1">
             <div className="flex flex-col items-center">
                <Sunrise size={14} className="text-orange-400 mb-1" />
                <span className="text-[10px] font-bold text-slate-600">{data.sunrise}</span>
             </div>
             <div className="flex flex-col items-center border-l border-r border-slate-200">
                <Sun size={14} className="text-amber-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-600">{data.dayLength}h</span>
             </div>
             <div className="flex flex-col items-center">
                <Sunset size={14} className="text-indigo-400 mb-1" />
                <span className="text-[10px] font-bold text-slate-600">{data.sunset}</span>
             </div>
          </div>

       </div>
    </div>
  );
};
