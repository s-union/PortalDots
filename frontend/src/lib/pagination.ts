export function calculateTotalPages(total: number, pageSize: number) {
  if (pageSize <= 0) {
    return 1
  }

  return Math.max(1, Math.ceil(total / pageSize))
}
