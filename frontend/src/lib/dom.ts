export function inputValue(event: Event): string {
  if (event.target instanceof HTMLInputElement) {
    return event.target.value
  }
  return ''
}

export function textareaValue(event: Event): string {
  if (event.target instanceof HTMLTextAreaElement) {
    return event.target.value
  }
  return ''
}

export function selectValue(event: Event): string {
  if (event.target instanceof HTMLSelectElement) {
    return event.target.value
  }
  return ''
}

export function inputChecked(event: Event): boolean {
  if (event.target instanceof HTMLInputElement) {
    return event.target.checked
  }
  return false
}
