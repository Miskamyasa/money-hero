import {Card, Group, SimpleGrid, Stack, Text} from "@mantine/core"

import type {ExpectedBalanceScenario} from "@renderer/stores/ExpectedBalanceStore"
import {formatChangePercent, formatPrice, getChangeColor} from "@renderer/utils/quoteFormatters"

const SCENARIO_GRID_STYLE = {
  alignItems: "baseline",
  gridTemplateColumns: "minmax(8rem, 1fr) minmax(12rem, auto) minmax(5.5rem, auto)",
}

type ExpectedBalanceWidgetProps = {
  conservative: ExpectedBalanceScenario,
  hotStreak: ExpectedBalanceScenario,
  title: string,
}

type ScenarioRowProps = {
  label: string,
  scenario: ExpectedBalanceScenario,
}

function ScenarioRow({label, scenario}: ScenarioRowProps): React.JSX.Element {
  return (
    <>
      <Text
        c="dimmed"
        size="sm">{label}</Text>
      <Text
        fw={700}
        size="lg"
        ta="right">{formatPrice(scenario.projectedBalanceIls, "ILS")}</Text>
      <Text
        c={getChangeColor(scenario.changePercent)}
        fw={700}
        size="sm"
        ta="right">{formatChangePercent(scenario.changePercent)}</Text>
    </>
  )
}

export function ExpectedBalanceWidget({conservative, hotStreak, title}: ExpectedBalanceWidgetProps): React.JSX.Element {
  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      shadow="sm">
      <Stack gap="md">
        <Group
          align="center"
          justify="space-between"
          wrap="nowrap">
          <Text
            fw={700}
            size="lg">Expected Balance</Text>
          <Text
            fw={700}
            size="lg">{title}</Text>
        </Group>
        <SimpleGrid
          cols={3}
          spacing="xs"
          style={SCENARIO_GRID_STYLE}>
          <ScenarioRow
            label="Conservative"
            scenario={conservative} />
          <ScenarioRow
            label="Hot streak"
            scenario={hotStreak} />
        </SimpleGrid>
      </Stack>
    </Card>
  )
}
