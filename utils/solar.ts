
// Solar calculation utilities
export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function getSunPosition(lat: number, lon: number, date: number, utcHour: number) {
  // lat: latitude in degrees
  // lon: longitude in degrees
  // date: day of year (1-365)
  // utcHour: Universal Time (decimal 0-24)

  // Solar Declination
  const declination = 23.45 * Math.sin(toRad((360 / 365) * (date - 81)));
  
  // Equation of Time (EoT) correction in minutes (approximation)
  const B = toRad((360 / 365) * (date - 81));
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  
  // Local Solar Time = UTC + (Lon / 15) + (EoT / 60)
  const localSolarTime = utcHour + (lon / 15) + (eot / 60);
  
  const timeOffset = 15 * (localSolarTime - 12); // degrees from solar noon
  
  // Altitude (Elevation)
  const sinAlt = Math.sin(toRad(lat)) * Math.sin(toRad(declination)) + 
                 Math.cos(toRad(lat)) * Math.cos(toRad(declination)) * Math.cos(toRad(timeOffset));
  const alt = Math.asin(sinAlt);
  
  // Azimuth
  const cosAz = (Math.sin(toRad(declination)) * Math.cos(toRad(lat)) - 
                 Math.cos(toRad(declination)) * Math.sin(toRad(lat)) * Math.cos(toRad(timeOffset))) / Math.cos(alt);
  let az = Math.acos(Math.min(1, Math.max(-1, cosAz)));
  
  // Check if afternoon or morning for azimuth correction
  if (Math.sin(toRad(timeOffset)) > 0) {
     az = 2 * Math.PI - az;
  }
  
  return { 
    altitude: alt, 
    azimuth: az,
    declination: declination,
    // Convert spherical to cartesian for 3D light position
    x: Math.sin(az) * Math.cos(alt),
    y: Math.sin(alt),
    z: Math.cos(az) * Math.cos(alt)
  };
}

export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getDateFromDayOfYear(day: number): Date {
  const date = new Date(new Date().getFullYear(), 0); // initialize at Jan 1st of current year
  date.setDate(day);
  return date;
}
