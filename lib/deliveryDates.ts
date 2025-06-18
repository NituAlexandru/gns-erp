import Holidays from 'date-holidays'

// iniţializează sărbătorile pentru România
const hd = new Holidays('RO')

/**
 * Adaugă `count` zile lucrătoare (L–V, excluzând sâmbăta, duminica și sărbătorile legale).
 */
export function addBusinessDays(start: Date, count: number): Date {
  const date = new Date(start)
  let added = 0

  while (added < count) {
    // înaintează cu o zi
    date.setDate(date.getDate() + 1)

    const day = date.getDay() // 0 = Duminică, 6 = Sâmbătă
    const isWeekend = day === 0 || day === 6
    const isHoliday = !!hd.isHoliday(date)

    if (!isWeekend && !isHoliday) {
      added++
    }
  }

  return date
}
