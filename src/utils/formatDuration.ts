export const formatDuration = (value?: string | number) => {
  if (!value) return value;

  const str = value.toString().toLowerCase();
  let totalMins = 0;

  const matches = str.matchAll(/(\d+)\s*([a-z]+)?/g);

  for (const [_, num, unit] of matches) {
    const val = parseInt(num);
    if (unit?.startsWith('h')) {
      totalMins += val * 60;
    } else {
      totalMins += val;
    }
  }

  if (totalMins === 0) return value;

  // 2. Convert back to hours and minutes
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;

  // 3. Return formatted string
  const hPart = h > 0 ? `${h}h` : '';
  const mPart = m > 0 ? `${m}m` : '';

  return `${hPart} ${mPart}`.trim();
};
