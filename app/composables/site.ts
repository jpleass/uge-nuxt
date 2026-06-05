export function useSite() {
  return useState<Record<string, any>>('app.site', () => ({}))
}
