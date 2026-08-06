export const tagColors = ['gray', 'red', 'orange', 'green', 'blue', 'purple'] as const

export type TagColor = (typeof tagColors)[number]

export function isTagColor(color?: string): color is TagColor {
  return tagColors.includes(color as TagColor)
}

const tagColorClasses: Record<TagColor, string> = {
  gray: 'border-tag-gray/40 text-tag-gray bg-tag-gray-light',
  red: 'border-tag-red/40 text-tag-red bg-tag-red-light',
  orange: 'border-tag-orange/40 text-tag-orange bg-tag-orange-light',
  green: 'border-tag-green/40 text-tag-green bg-tag-green-light',
  blue: 'border-tag-blue/40 text-tag-blue bg-tag-blue-light',
  purple: 'border-tag-purple/40 text-tag-purple bg-tag-purple-light'
}

export function tagColorClass(color?: string): string {
  return tagColorClasses[color as TagColor] ?? tagColorClasses.gray
}
