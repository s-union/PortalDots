export function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

export function textareaValue(event: Event): string {
  return (event.target as HTMLTextAreaElement).value
}

export function selectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value
}

export function inputChecked(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}
