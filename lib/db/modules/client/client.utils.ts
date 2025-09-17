// Funcție helper pentru afișarea timpului în format prietenos
export const formatMinutes = (minutes: number | undefined) => {
  if (!minutes || minutes < 0) return 'N/A'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}
