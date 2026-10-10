import type { PostgrestError } from '@supabase/supabase-js'

/** True when Postgres says a column we asked for doesn't exist (database update not run yet). */
export function isMissingColumn(error: PostgrestError | null | undefined): boolean {
  if (!error) return false
  return error.code === '42703' || /column .* does not exist/i.test(error.message ?? '')
}

/** True when a whole table isn't there yet (database update not run yet). */
export function isMissingTable(error: PostgrestError | null | undefined): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === 'PGRST205' || /could not find the table|relation .* does not exist/i.test(error.message ?? '')
}

/**
 * Run a query with the newest column list; if the database hasn't been updated
 * yet (missing column), run it again with the older list so the app keeps working.
 */
export async function withColumnFallback<T>(
  run: (select: string) => PromiseLike<{ data: T; error: PostgrestError | null }>,
  select: string,
  legacySelect: string,
): Promise<{ data: T; error: PostgrestError | null }> {
  const first = await run(select)
  if (!isMissingColumn(first.error) || legacySelect === select) return first
  return run(legacySelect)
}

/** Drop newer optional profile fields from a select string. */
export function withoutNewProfileFields(select: string): string {
  return select.replace(/,\s*is_official/g, '')
}
