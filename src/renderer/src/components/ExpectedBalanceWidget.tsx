import {Card, Group, Stack, Text} from "@mantine/core"

import {formatChangePercent, formatPrice, getChangeColor} from "@renderer/utils/quoteFormatters"

type ExpectedBalanceWidgetProps = {
  changePercent: number,
  title: string,
  value: number,
}

export function ExpectedBalanceWidget({changePercent, title, value}: ExpectedBalanceWidgetProps): React.JSX.Element {
  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      shadow="sm">
      <Stack gap="md">
        <Text
          fw={700}
          size="lg">{title}</Text>
        <Stack gap={4}>
          <Text
            c="dimmed"
            size="xs">Projected Total</Text>
          <Group
            align="baseline"
            justify="space-between"
            wrap="nowrap">
            <Text
              fw={700}
              size="xl">{formatPrice(value, "ILS")}</Text>
            <Text
              c={getChangeColor(changePercent)}
              fw={700}
              size="sm">{formatChangePercent(changePercent)}</Text>
          </Group>
        </Stack>
      </Stack>
    </Card>
  )
}
