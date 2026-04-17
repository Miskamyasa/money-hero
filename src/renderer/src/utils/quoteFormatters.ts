export function formatPrice(value: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {style: "currency", currency}).format(value)
  }
  catch {
    return new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(value)
  }
}

export function formatChange(value: number, currency = "USD"): string {
  const formatted = formatPrice(value, currency)
  return value >= 0 ? `+${formatted}` : formatted
}

export function formatChangePercent(value: number): string {
  const formatted = value.toFixed(2)
  return value >= 0 ? `+${formatted}%` : `${formatted}%`
}

export function getChangeColor(value: number): string {
  return value >= 0 ? "teal" : "red"
}
