export function filterFalsey<T>(arr: (T | false | undefined | null)[]): T[] {
  return arr.filter(value => value) as T[]
}
