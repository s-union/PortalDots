export function compareString(left: string, right: string): number {
  return left.localeCompare(right, 'ja')
}

export function compareBoolean(left: boolean, right: boolean): number {
  if (left === right) return 0
  return left ? 1 : -1
}
