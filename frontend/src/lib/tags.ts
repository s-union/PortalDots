export function parseTagString(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ]
}

export function formatTags(tags: string[]): string {
  return tags.join('\n')
}
