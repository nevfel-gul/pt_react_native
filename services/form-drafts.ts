import AsyncStorage from '@react-native-async-storage/async-storage';

const TTL = 14 * 86400000;
export const draftKey = (uid: string, scope: string) => `form-draft:v1:${uid}:${scope}`;

// Serialize writes and removals so a late autosave cannot resurrect a submitted draft.
export class DraftStore {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(readonly key: string) {}
  async read<T>(): Promise<T | null> {
    await this.pending;
    const raw = await AsyncStorage.getItem(this.key);
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw);
      if (saved.version === 1 && typeof saved.savedAt === 'number' && Date.now() - saved.savedAt < TTL) return saved.value;
    } catch { /* Discard a corrupt or obsolete draft, never cloud data. */ }
    await this.clear();
    return null;
  }
  save(value: unknown) {
    const raw = JSON.stringify({ version: 1, savedAt: Date.now(), value });
    return this.enqueue(() => AsyncStorage.setItem(this.key, raw));
  }
  clear() { return this.enqueue(() => AsyncStorage.removeItem(this.key)); }
  private enqueue(operation: () => Promise<void>) {
    const next = this.pending.catch(() => {}).then(operation);
    this.pending = next;
    return next;
  }
}
