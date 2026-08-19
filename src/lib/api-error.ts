export function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error: unknown }).error
    if (typeof error === 'string') return error
    if (error && typeof error === 'object') {
      const flattened = error as { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> }
      const messages = [
        ...(flattened.formErrors ?? []),
        ...Object.values(flattened.fieldErrors ?? {}).flatMap((messages) => messages ?? []),
      ]
      if (messages.length > 0) return messages.join(', ')
    }
  }
  return fallback
}
