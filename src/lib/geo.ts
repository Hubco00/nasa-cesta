const EARTH_RADIUS_METERS = 6_371_000

export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Vzdialenosť medzi dvoma GPS bodmi v metroch (Haversinova formula).
 */
export function distanceInMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return EARTH_RADIUS_METERS * c
}

export type LocationCheckStatus = 'within_range' | 'too_far' | 'unavailable'

/**
 * Vyhodnotí, či je hráčka v rámci povoleného rádiusu od cieľa.
 * `accuracyMeters` (presnosť z Geolocation API) sa pripočíta ako tolerancia,
 * aby bežná GPS nepresnosť nespôsobovala falošné "Príliš ďaleko".
 */
export function checkLocation(
  current: Coordinates,
  target: Coordinates,
  allowedRadiusMeters: number,
  accuracyMeters = 0,
): { status: LocationCheckStatus; distanceMeters: number } {
  const distanceMeters = distanceInMeters(current, target)
  const tolerance = Math.min(accuracyMeters, 50)
  const withinRange = distanceMeters <= allowedRadiusMeters + tolerance

  return {
    status: withinRange ? 'within_range' : 'too_far',
    distanceMeters,
  }
}
