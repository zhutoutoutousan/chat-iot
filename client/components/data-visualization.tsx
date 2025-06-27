import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react"

interface DataVisualizationProps {
  data: {
    type: string
    title: string
    value?: number
    trend?: "up" | "down" | "stable"
    status?: "normal" | "warning" | "critical"
    chartData?: any[]
    insights?: string[]
  }
}

export function DataVisualization({ data }: DataVisualizationProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{data.title}</CardTitle>
          <div className="flex items-center gap-2">
            {data.trend && getTrendIcon(data.trend)}
            {data.status && <Badge className={getStatusColor(data.status)}>{data.status}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.value !== undefined && <div className="text-3xl font-bold mb-4">{data.value.toLocaleString()}</div>}

        {data.type === "chart" && data.chartData && (
          <div className="h-32 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center mb-4">
            <div className="text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Chart visualization would render here</p>
              <p className="text-xs">({data.chartData.length} data points)</p>
            </div>
          </div>
        )}

        {data.insights && data.insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Key Insights
            </h4>
            <ul className="space-y-1">
              {data.insights.map((insight, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
