export const DEFAULT_ALLOWED_HOURS = '08:00-18:00'

// Tipul corect pentru un șablon de vehicul
export interface VehicleTemplate {
  name: string
  maxLoadKg: number
  maxVolumeM3: number
  lengthCm: number
  widthCm: number
  heightCm: number
  ratePerKm: number
}

// Lista ta de șabloane
export const VEHICLE_TEMPLATES: VehicleTemplate[] = [
  {
    name: 'Curier',
    maxLoadKg: 30,
    maxVolumeM3: 0.09,
    lengthCm: 60,
    widthCm: 50,
    heightCm: 30,
    ratePerKm: 1,
  },
  {
    name: 'Autoturism',
    maxLoadKg: 850,
    maxVolumeM3: 2.25,
    lengthCm: 150,
    widthCm: 120,
    heightCm: 125,
    ratePerKm: 1.0,
  },
  {
    name: 'Autoutilitara cu Prelata',
    maxLoadKg: 1500,
    maxVolumeM3: 13.0,
    lengthCm: 380,
    widthCm: 205,
    heightCm: 180,
    ratePerKm: 2.0,
  },
  {
    name: 'Camion cu Macara 7t',
    maxLoadKg: 3200,
    maxVolumeM3: 18.0,
    lengthCm: 400,
    widthCm: 210,
    heightCm: 220,
    ratePerKm: 2.0,
  },
  {
    name: 'Camion cu Macara 13t',
    maxLoadKg: 6400,
    maxVolumeM3: 28.0,
    lengthCm: 550,
    widthCm: 240,
    heightCm: 220,
    ratePerKm: 2.5,
  },
  {
    name: 'Camion cu Macara 22t',
    maxLoadKg: 11000,
    maxVolumeM3: 28.0,
    lengthCm: 620,
    widthCm: 240,
    heightCm: 220,
    ratePerKm: 6.0,
  },
  {
    name: 'Camion cu Macara 22t cu Remorca',
    maxLoadKg: 22000,
    maxVolumeM3: 56.0,
    lengthCm: 620,
    widthCm: 240,
    heightCm: 220,
    ratePerKm: 6.0,
  },
  {
    name: 'Cap Tractor - Tir',
    maxLoadKg: 23000,
    maxVolumeM3: 86.0,
    lengthCm: 1300,
    widthCm: 245,
    heightCm: 270,
    ratePerKm: 5.5,
  },
]

// ✨ NOU: O listă care conține DOAR NUMELE, pentru validare
export const VEHICLE_TYPE_NAMES = VEHICLE_TEMPLATES.map((v) => v.name) as [
  string,
  ...string[],
]
