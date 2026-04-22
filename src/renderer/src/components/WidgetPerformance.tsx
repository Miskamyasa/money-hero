import {Group, Paper, Stack, Text} from "@mantine/core"

import {formatChangePercent, getChangeColor} from "@renderer/utils/quoteFormatters"
import {getPerformancePeriods} from "@renderer/utils/statsWidgets"
import type {PerformanceChanges} from "@renderer/utils/statsWidgets"

type WidgetPerformanceProps = {
  changes: PerformanceChanges,
}

type PriceChangeCardProps = {
  label: string,
  value: number | null,
}

function PriceChangeCard({label, value}: PriceChangeCardProps): React.JSX.Element {
  return (
    <Paper
      withBorder
      p="sm"
      radius="sm">
      <Stack
        align="center"
        gap={4}>
        <Text
          c="dimmed"
          size="xs">{label}</Text>
        {value != null
          ? (
            <Text
              c={getChangeColor(value)}
              fw={700}
              size="lg">
              {formatChangePercent(value)}
            </Text>
          )
          : (
            <Text
              c="dimmed"
              fw={700}
              size="lg">N/A</Text>
          )}
      </Stack>
    </Paper>
  )
}

export function WidgetPerformance({changes}: WidgetPerformanceProps): React.JSX.Element {
  return (
    <Group grow>
      {getPerformancePeriods(changes).map(period => (
        <PriceChangeCard
          key={period.key}
          label={period.label}
          value={period.value}/>
      ))}
    </Group>
  )
}
