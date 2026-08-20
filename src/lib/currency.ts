export function convertRsdToEur(amountRsd: number, rate: number): number {
  if (!(rate > 0)) {
    throw new Error(`Invalid RSD→EUR rate: ${rate}`)
  }
  return amountRsd / rate
}

export function formatRsd(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(amount * 100) / 100)
}

// Plain thousands-separated number, no currency symbol — for chart axis
// ticks and other tight spaces where a full currency string is too wide.
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 }).format(amount)
}
