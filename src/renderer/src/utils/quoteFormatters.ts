// Subunit currencies: code → { parent ISO code, divisor }
const SUBUNIT_CURRENCIES: Record<string, {code: string, divisor: number}> = {
  ILA: {code: "ILS", divisor: 100},
  GBp: {code: "GBP", divisor: 100},
}

export function normalizeCurrency(currency: string): string {
  return SUBUNIT_CURRENCIES[currency]?.code ?? currency
}

export function formatPrice(value: number, currency = "USD"): string {
  const subunit = SUBUNIT_CURRENCIES[currency]
  const code = subunit?.code ?? currency
  const amount = subunit ? value / subunit.divisor : value
  try {
    return new Intl.NumberFormat("en-US", {style: "currency", currency: code, currencyDisplay: "code"}).format(amount)
  }
  catch {
    return new Intl.NumberFormat("en-US", {style: "currency", currency: "USD", currencyDisplay: "code"}).format(amount)
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

export function formatSharePercent(ratio: number): string {
  if (!Number.isFinite(ratio)) {
    return ""
  }
  return `${(ratio * 100).toFixed(2)}%`
}

export function formatShareBracket(ratio: number): string {
  const formatted = formatSharePercent(ratio)
  return formatted ? `(${formatted})` : ""
}

export function getChangeColor(value: number): string {
  return value >= 0 ? "teal" : "red"
}
