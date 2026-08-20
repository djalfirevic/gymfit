/**
 * API routes answer with stable codes (MEMBER_NOT_FOUND) rather than prose, so
 * responses carry no UI language. `translate` turns a known code into the
 * viewer's language; anything that isn't a code is passed through unchanged.
 */
const ERROR_CODE = /^[A-Z][A-Z0-9_]*$/

function resolve(value: string, translate?: (code: string) => string): string {
  return translate && ERROR_CODE.test(value) ? translate(value) : value
}

export function errorMessage(
  body: unknown,
  fallback: string,
  translate?: (code: string) => string,
): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error: unknown }).error
    if (typeof error === 'string') return resolve(error, translate)
    if (error && typeof error === 'object') {
      const flattened = error as { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> }
      const messages = [
        ...(flattened.formErrors ?? []),
        ...Object.values(flattened.fieldErrors ?? {}).flatMap((messages) => messages ?? []),
      ].map((message) => resolve(message, translate))
      if (messages.length > 0) return messages.join(', ')
    }
  }
  return fallback
}
