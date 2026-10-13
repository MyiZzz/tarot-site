const pad = (value: number) => `${value}`.padStart(2, '0')

export const buildLocalDateKey = (date: Date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const formatLocalFileDate = (date: Date = new Date()) => buildLocalDateKey(date)

export const getMillisecondsUntilNextLocalDay = (date: Date = new Date()) => {
  const nextDay = new Date(date)
  nextDay.setHours(24, 0, 0, 0)

  return nextDay.getTime() - date.getTime()
}

export const formatDailyLabel = (date: Date = new Date()) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)

