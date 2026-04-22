import {Card, Stack, Text} from "@mantine/core"

import {WidgetPerformance} from "@renderer/components/WidgetPerformance"
import {formatPrice} from "@renderer/utils/quoteFormatters"
import type {PerformanceChanges} from "@renderer/utils/statsWidgets"

type InfoWidgetProps = {
  changes: PerformanceChanges,
  currency: string,
  hasData: boolean,
  price: number,
  title: string,
}

export function InfoWidget({changes, currency, hasData, price, title}: InfoWidgetProps): React.JSX.Element {
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

        {hasData
          ? (
            <>
              <Stack gap={4}>
                <Text
                  c="dimmed"
                  size="xs">Price</Text>
                <Text
                  fw={700}
                  size="xl">{formatPrice(price, currency)}</Text>
              </Stack>

              <WidgetPerformance changes={changes} />
            </>
          )
          : (
            <Text
              c="dimmed"
              ta="center">No data</Text>
          )}
      </Stack>
    </Card>
  )
}
