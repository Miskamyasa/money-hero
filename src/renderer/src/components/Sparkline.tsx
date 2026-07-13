export type HistoryPoint = {
  t: number,
  c: number,
}

const SECONDS_PER_DAY = 86400

export function slicePointsByMonths(
  points: HistoryPoint[],
  months: number,
): HistoryPoint[] {
  if (points.length === 0) return []
  const cutoff = (Date.now() / 1000) - months * 30.44 * SECONDS_PER_DAY
  return points.filter(p => p.t >= cutoff)
}

type SparklineProps = {
  points: HistoryPoint[],
  width?: number,
  height?: number,
}

function buildPolylinePoints(
  points: HistoryPoint[],
  width: number,
  height: number,
  padding: number,
): string {
  if (points.length === 0) return ""

  const closes = points.map(p => p.c)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1

  const plotW = width - padding * 2
  const plotH = height - padding * 2

  return points
    .map((p, i) => {
      const x = padding + (i / (points.length - 1)) * plotW
      const y = padding + plotH - ((p.c - min) / range) * plotH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

function formatDate(timestamp: number, includeYear: boolean): string {
  const options: Intl.DateTimeFormatOptions = includeYear
    ? {month: "short", day: "numeric", year: "2-digit"}
    : {month: "short", day: "numeric"}
  return new Date(timestamp * 1000).toLocaleDateString("en-US", options)
}

function spanExceedsMonths(points: HistoryPoint[], months: number): boolean {
  if (points.length < 2) return false
  const spanSeconds = points[points.length - 1].t - points[0].t
  return spanSeconds > months * 30.44 * SECONDS_PER_DAY
}

export function Sparkline({points, width = 240, height = 90}: SparklineProps): React.JSX.Element {
  if (points.length < 2) {
    return (
      <svg
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        width={width}>
        <text
          dominantBaseline="middle"
          fill="var(--mantine-color-dimmed)"
          fontSize="12"
          textAnchor="middle"
          x={width / 2}
          y={height / 2}>
          No data
        </text>
      </svg>
    )
  }

  const padding = 4
  const polyline = buildPolylinePoints(points, width, height, padding)

  const first = points[0]
  const last = points[points.length - 1]
  const showYear = spanExceedsMonths(points, 3)
  const isPositive = last.c >= first.c
  const strokeColor = isPositive
    ? "var(--mantine-color-teal-6)"
    : "var(--mantine-color-red-6)"
  const fillColor = isPositive
    ? "var(--mantine-color-teal-1)"
    : "var(--mantine-color-red-1)"

  const closes = points.map(p => p.c)
  const min = Math.min(...closes)
  const max = Math.max(...closes)

  // Build closed polygon for area fill
  const plotW = width - padding * 2
  const bottomLeft = `${padding.toFixed(1)},${(height - padding).toFixed(1)}`
  const bottomRight = `${(padding + plotW).toFixed(1)},${(height - padding).toFixed(1)}`
  const areaPoints = `${bottomLeft} ${polyline} ${bottomRight}`

  return (
    <div>
      <svg
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        width={width}>
        <polygon
          fill={fillColor}
          opacity="0.3"
          points={areaPoints} />
        <polyline
          fill="none"
          points={polyline}
          stroke={strokeColor}
          strokeLinejoin="round"
          strokeWidth="1.5" />
      </svg>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 10,
        color: "var(--mantine-color-dimmed)",
        marginTop: 2,
      }}>
        <span>{formatDate(first.t, showYear)}</span>
        <span style={{
          color: "var(--mantine-color-text)",
          fontWeight: 600,
        }}>
          {min.toFixed(2)}
          {" – "}
          {max.toFixed(2)}
        </span>
        <span>{formatDate(last.t, showYear)}</span>
      </div>
    </div>
  )
}
