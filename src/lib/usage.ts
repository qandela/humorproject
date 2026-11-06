export function generationUsage(dates: string[], now = Date.now()) {
  const recent = dates.map(date => new Date(date).getTime()).filter(time => Number.isFinite(time) && time > now - 86400000);
  return {
    remaining: Math.max(0, 10 - recent.length),
    nextSlot: recent.length >= 10 ? new Date(Math.min(...recent) + 86400000).toISOString() : null,
  };
}
