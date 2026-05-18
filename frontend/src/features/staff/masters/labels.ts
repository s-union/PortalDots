export function placeTypeLabel(placeType: number) {
  switch (placeType) {
    case 1:
      return '屋内'
    case 2:
      return '屋外'
    case 3:
      return '特殊場所'
    default:
      return String(placeType)
  }
}
