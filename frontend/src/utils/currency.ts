import type { Currency } from '../api/endpoints';

/** Format a price in the given currency (XAF, USD, EUR). */
export function formatPrice(price: number | undefined, currency: Currency = 'USD'): string {
  if (price == null || price === 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

/** Label for "Price (XAF)" etc. */
export function priceLabel(currency: Currency): string {
  return `Price (${currency})`;
}
