/** Turn any thrown value into a short, human sentence for the UI. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw =
    typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : ''

  if (!raw) return fallback
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return "Can't reach the server. Check your connection and try again."
  }
  if (/invalid login credentials/i.test(raw)) return 'That email and password don’t match.'
  if (/user already registered/i.test(raw)) return 'An account with this email already exists. Try logging in.'
  if (/jwt expired/i.test(raw)) return 'Your session expired. Please log in again.'
  if (/duplicate key value.*username/i.test(raw) || /profiles_username_lower_key/i.test(raw)) {
    return 'That username is taken. Try another one.'
  }
  if (/row-level security/i.test(raw)) return "You don't have permission to do that."
  return raw
}
