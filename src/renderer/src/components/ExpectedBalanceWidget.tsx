import {Card, Stack, Text} from "@mantine/core"

import {formatPrice} from "@renderer/utils/quoteFormatters"

type ExpectedBalanceWidgetProps = {
  title: string,
  value: number,
}

export function ExpectedBalanceWidget({title, value}: ExpectedBalanceWidgetProps): React.JSX.Element {
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
          <Text
            fw={700}
            size="xl">{formatPrice(value, "ILS")}</Text>
        </Stack>
      </Stack>
    </Card>
  )
}
