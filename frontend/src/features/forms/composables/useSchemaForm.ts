import type * as v from 'valibot'

export { useServerSyncedForm as useSchemaForm } from './useServerSyncedForm'
export type { SchemaFormInput, SchemaFormSnapshot, SchemaFormSaveResult } from './useServerSyncedForm'
export type GroupedFormInput = Record<string, Record<string, string | string[] | undefined>>
export type GroupedFormSchema = v.GenericSchema<GroupedFormInput>
export type GroupedFieldPath = readonly [string, string]
