import type { FieldElementProps } from '@formisch/vue'

export type FieldControl = FieldElementProps & {
  id: string
  'data-field-path': string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}
