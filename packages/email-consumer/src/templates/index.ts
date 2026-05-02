import { renderMarkdownNotice } from './markdown-notice'
import { renderRegistrationVerify } from './registration-verify'

export type TemplateRenderer = (variables: Record<string, string>) => Promise<{ html: string; text: string }>

export const templates: Record<string, TemplateRenderer> = {
  'markdown-notice': renderMarkdownNotice,
  'registration-verify': renderRegistrationVerify
}

export function renderTemplate(templateName: string, variables: Record<string, string>) {
  const renderer = templates[templateName]
  if (!renderer) {
    throw new Error(`Unknown template: ${templateName}`)
  }
  return renderer(variables)
}
