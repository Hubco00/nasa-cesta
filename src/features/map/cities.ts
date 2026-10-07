export const MAP_IMAGE_SRC = '/map/kingdom-of-slovakia.jpg'
export const MAP_IMAGE_WIDTH = 1410
export const MAP_IMAGE_HEIGHT = 752

export interface MapCity {
  key: string
  label: string
  /** Poloha ikonky mesta v % šírky/výšky obrázka mapy. */
  x: number
  y: number
  /** Mesto nie je nakreslené na obrázku mapy — pri guličke sa ukáže menovka. */
  drawLabel?: boolean
}

// Kľúče musia sedieť s CHECK constraintom na chapter_map_pins.city_key.
export const MAP_CITIES: MapCity[] = [
  { key: 'bratislava', label: 'Bratislava', x: 13.8, y: 72.5 },
  { key: 'trnava', label: 'Trnava', x: 24.8, y: 61.2 },
  { key: 'puchov', label: 'Púchov', x: 29.1, y: 39.9 },
  { key: 'zbynov', label: 'Zbyňov', x: 34.8, y: 46.5 },
  { key: 'zilina', label: 'Žilina', x: 36.9, y: 27.9 },
  { key: 'vricko', label: 'Vrícko', x: 46.1, y: 43.9 },
  { key: 'dolny_kubin', label: 'Dolný Kubín', x: 47.2, y: 18.6 },
  // Pri Váhu medzi Žilinou a Dolným Kubínom (za Vrútkami).
  { key: 'sutovo', label: 'Šútovo', x: 45.6, y: 31.2, drawLabel: true },
  { key: 'presov', label: 'Prešov', x: 76.2, y: 34.6 },
  { key: 'kosice', label: 'Košice', x: 76.2, y: 49.2 },
]

export function findCity(key: string): MapCity | undefined {
  return MAP_CITIES.find((c) => c.key === key)
}
