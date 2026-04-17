export const formatDuration = (value?: string) => {
  if(!value) {
    return value
  }

  return value
    .replace(/\b(hours|hour|hrs|hr)\b/gi, 'h')
    .replace(/\b(minutes|minute|mins|min)\b/gi, 'm')
    .replace(/\s+/g, ' ')
    .trim()
}
