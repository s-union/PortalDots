import type * as v from 'valibot'

type Value = string | string[] | boolean | undefined
export type SyncedInput = Record<string, Value | Record<string, Value>>
export type SyncedFormSchema = v.GenericSchema<SyncedInput, Record<string, unknown>>
type FieldPath<Name extends string, Input> =
  Input extends Record<string, Value> ? readonly [Name, keyof Input & string] : readonly [Name]
export type SyncedFieldPath<T extends SyncedFormSchema = SyncedFormSchema> = {
  [Name in keyof v.InferInput<T> & string]: FieldPath<Name, v.InferInput<T>[Name]>
}[keyof v.InferInput<T> & string]

type Address = { path: readonly [string] } | { path: readonly [string, string] }
type Field = Address & { initialInput: Value }
export function fields(input: SyncedInput): Field[] {
  return Object.entries(input).flatMap(([key, value]): Field[] =>
    typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value).map(([name, initialInput]) => ({ path: [key, name], initialInput }))
      : [{ path: [key], initialInput: value }]
  )
}
export function write(input: SyncedInput, path: SyncedFieldPath, value: Value) {
  if (path.length === 1) {
    input[path[0]] = value
    return
  }
  const group = input[path[0]]
  if (typeof group === 'object' && !Array.isArray(group)) group[path[1]] = value
}
export function read(input: unknown, path: SyncedFieldPath): unknown {
  let value = input
  for (const key of path)
    value = value && typeof value === 'object' && key in value ? Reflect.get(value, key) : undefined
  return value
}
export function equal(a: unknown, b: unknown): boolean {
  return Array.isArray(a)
    ? Array.isArray(b) && a.length === b.length && a.every((item, i) => item === b[i])
    : Object.is(a, b)
}
export function compatible(initial: Value, previous: unknown): previous is Exclude<Value, undefined> {
  return Array.isArray(initial)
    ? Array.isArray(previous) && previous.every((item) => typeof item === 'string')
    : typeof initial === 'boolean'
      ? typeof previous === 'boolean'
      : typeof previous === 'string'
}
