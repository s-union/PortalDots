import { renderMarkdownNotice } from './markdown-notice'
import { renderRegistrationVerify } from './registration-verify'
import { renderStaffAuthNotice } from './staff-auth-notice'

export type TemplateRenderer = (variables: Record<string, string>) => Promise<{ html: string; text: string }>

export const templates: Record<string, TemplateRenderer> = {
  'markdown-notice': renderMarkdownNotice,
  'registration-verify': renderRegistrationVerify,
  'staff-auth-notice': renderStaffAuthNotice
}

export function renderTemplate(templateName: string, variables: Record<string, string>) {
  const renderer = templates[templateName]
  if (!renderer) {
    throw new Error(`Unknown template: ${templateName}`)
  }
  return renderer(variables)
}
