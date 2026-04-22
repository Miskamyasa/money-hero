import {useEffect} from "react"

import {observer} from "mobx-react-lite"

import {InfoWidget} from "@renderer/components/InfoWidget"
import {GOLD_WIDGET_TITLE} from "@renderer/config/statsWidgets"
import {useStores} from "@renderer/stores/useStores"

function GoldStatsImpl(): React.JSX.Element {
  const {gold} = useStores()
  const quote = gold.quote
  const history = gold.history
  const hasData = quote != null && history != null

  useEffect(() => {
    void gold.loadFromCache()
  }, [gold])

  return (
    <InfoWidget
      changes={{
        change1m: history?.change1m ?? null,
        change6m: history?.change6m ?? null,
        change2y: history?.change2y ?? null,
      }}
      currency={quote?.currency ?? "USD"}
      hasData={hasData}
      price={quote?.price ?? 0}
      title={GOLD_WIDGET_TITLE} />
  )
}

export const GoldStats = observer(GoldStatsImpl)
