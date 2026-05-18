export function normalizeOptions(raw: string) {
  return [
    ...new Set(
      raw
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ]
}
