const WEEKDAY_NAMES = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag']

export function getDateForWeekday(day: string): string {
  const idx = WEEKDAY_NAMES.indexOf(day.toLowerCase())
  if (idx === -1) return new Date().toISOString().slice(0, 10)
  const now = new Date()
  const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMonday)
  const target = new Date(monday)
  target.setDate(monday.getDate() + idx)
  return target.toISOString().slice(0, 10)
}

export function getMonthKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

export function getISOWeek(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  return `${d.getFullYear()}-v${weekNum}`
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export function getWeekLabel(weekKey: string): string {
  const match = weekKey.match(/^(\d{4})-v(\d+)$/)
  if (!match) return weekKey
  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)

  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = (jan4.getDay() + 6) % 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const s = `${monday.getDate()} ${MONTHS[monday.getMonth()]}`
  const e = `${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`
  const range = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()}–${sunday.getDate()} ${MONTHS[monday.getMonth()]}`
    : `${s}–${e}`

  return `V${week} (${range})`
}
