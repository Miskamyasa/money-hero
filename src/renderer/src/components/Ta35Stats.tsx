import {useEffect} from "react"

import {observer} from "mobx-react-lite"

import {InfoWidget} from "@renderer/components/InfoWidget"
import {TA35_WIDGET_TITLE} from "@renderer/config/statsWidgets"
import {useStores} from "@renderer/stores/useStores"

function Ta35StatsImpl(): React.JSX.Element {
  const {ta35} = useStores()
  const quote = ta35.quote

  useEffect(() => {
    void ta35.loadFromCache()
  }, [ta35])

  return (
    <InfoWidget
      changes={{
        change1m: quote?.change1m ?? null,
        change6m: quote?.change6m ?? null,
        change2y: quote?.change2y ?? null,
      }}
      currency={quote?.currency ?? "USD"}
      hasData={quote != null}
      price={quote?.price ?? 0}
      title={TA35_WIDGET_TITLE} />
  )
}

export const Ta35Stats = observer(Ta35StatsImpl)
