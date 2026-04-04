export function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return '0B'
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes}B`
  }
  if (sizeBytes < 1024 * 1024) {
    return `${formatSizeUnit(sizeBytes / 1024)}KB`
  }
  return `${formatSizeUnit(sizeBytes / (1024 * 1024))}MB`
}

function formatSizeUnit(value: number) {
  return value
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
}
