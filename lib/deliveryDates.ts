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

/**
 * Verifică dacă o anumită dată este zi lucrătoare (nu e weekend și nu e sărbătoare).
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  const isWeekend = day === 0 || day === 6
  const isHoliday = !!hd.isHoliday(date)

  return !isWeekend && !isHoliday
}

/**
 * Găsește următoarea zi lucrătoare pornind de la o dată (dacă data curentă e liberă, o împinge până dă de o zi de muncă).
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date)
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1)
  }
  return result
}
