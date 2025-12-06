export const LOCKING_STATUS = {
  AUTO: 'AUTO',
  MANUAL_BLOCK: 'MANUAL_BLOCK',
  MANUAL_UNBLOCK: 'MANUAL_UNBLOCK',
} as const

export type LockingStatusType =
  (typeof LOCKING_STATUS)[keyof typeof LOCKING_STATUS]

export const LOCKING_STATUS_LABELS: Record<LockingStatusType, string> = {
  [LOCKING_STATUS.AUTO]: 'Automat (Bazat pe Plafon)',
  [LOCKING_STATUS.MANUAL_BLOCK]: 'Blocare Manuală, Plafonul este ignorat!',
  [LOCKING_STATUS.MANUAL_UNBLOCK]:
    'Deblocare Manuală, plafonul este ignorat ( Riscant! )',
}

// Opțional: Culori pentru UI în funcție de selecție
export const LOCKING_STATUS_COLORS: Record<LockingStatusType, string> = {
  [LOCKING_STATUS.AUTO]: 'text-gray-500',
  [LOCKING_STATUS.MANUAL_BLOCK]: 'text-red-600',
  [LOCKING_STATUS.MANUAL_UNBLOCK]: 'text-amber-600',
}
