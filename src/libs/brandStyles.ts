export function getSafeBrandStyles(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''

  return Object.entries(value)
    .filter(
      ([key, color]) =>
        /^--clr-[a-z0-9-]+$/.test(key) &&
        typeof color === 'string' &&
        /^#[\da-f]{3,8}$/i.test(color),
    )
    .map(([key, color]) => `${key}: ${color}`)
    .join('; ')
}
