// Use both app visits and saved work, including work saved by older app versions.
export function lastActivityMillis(profile: Record<string, any>, savedWork: unknown[] = []): number {
  const values = [profile.createdAt, profile.lastActiveAt, ...savedWork];
  return Math.max(0, ...values.map(value => {
    const ms = (value as { toMillis?: () => number } | undefined)?.toMillis?.();
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : 0;
  }));
}
