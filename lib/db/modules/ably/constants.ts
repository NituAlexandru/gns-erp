export const ABLY_API_ENDPOINTS = {
  AUTH: '/api/ably/ably-auth',
  PUBLISH: '/api/ably/publish',
} as const

/**
 * Canalele (Channels) sunt "frecvențele" pe care ascultăm.
 * Ex: Un canal pentru planner, unul pentru stocuri, etc.
 */
export const ABLY_CHANNELS = {
  PLANNER: 'planner-updates',
  // Pe viitor, poți adăuga:
  // STOCK: 'stock-updates',
  // ORDERS: 'new-orders',
} as const

/**
 * Evenimentele (Events) sunt "tipurile de mesaje" pe un canal.
 * Ex: Pe canalul PLANNER, putem avea un eveniment
 * de 'data-changed', 'item-locked', 'item-unlocked' etc.
 */
export const ABLY_EVENTS = {
  DATA_CHANGED: 'data-changed',
  // Pe viitor:
  // ITEM_LOCKED: 'item-locked',
} as const
