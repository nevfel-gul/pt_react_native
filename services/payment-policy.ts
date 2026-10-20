export function paymentAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) throw new Error('invalid_payment');
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  if (!rounded) throw new Error('invalid_payment');
  return rounded;
}

export function parseMoneyInput(input: string, locale: string): number | null {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const group = parts.find(p => p.type === 'group')?.value ?? ',';
  const decimal = parts.find(p => p.type === 'decimal')?.value ?? '.';
  const cleaned = input.trim().replace(/\s/g, '').split(group).join('').split(decimal).join('.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}
