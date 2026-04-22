import {PERFORMANCE_PERIODS, SYMBOL_TITLE_MAX_WORDS} from "@renderer/config/statsWidgets"

type PerformanceChangeKey = typeof PERFORMANCE_PERIODS[number]["key"]

export type PerformanceChanges = Record<PerformanceChangeKey, number | null>

export function truncateWords(value: string, maxWords = SYMBOL_TITLE_MAX_WORDS): string {
  return value.split(/\s+/).slice(0, maxWords).join(" ")
}

export function formatSymbolWidgetTitle(name: string | undefined, symbol: string): string {
  return name ? `${truncateWords(name)} (${symbol})` : symbol
}

export function getPerformancePeriods(
  changes: PerformanceChanges,
): {key: string, label: string, value: number | null}[] {
  return PERFORMANCE_PERIODS.map(period => ({
    key: period.key,
    label: period.label,
    value: changes[period.key],
  }))
}
