export interface LatLng {
  lat: number
  lng: number
}

/** Vzdialenosť v čitateľnom tvare — „350 m“, „2,4 km“, „120 km“. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`
}
