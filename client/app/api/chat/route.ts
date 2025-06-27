import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, dataSource, agent } = await req.json()

  // Define agent personalities and capabilities
  const agentPrompts = {
    "data-analyst": `You are a Data Analyst AI specializing in IoT sensor data analysis. You excel at:
    - Identifying trends and patterns in time-series data
    - Statistical analysis and correlation detection
    - Creating data summaries and reports
    - Explaining complex data insights in simple terms`,

    "anomaly-detector": `You are an Anomaly Detection AI focused on identifying unusual patterns in IoT data. You specialize in:
    - Detecting outliers and abnormal sensor readings
    - Identifying potential equipment failures
    - Flagging security concerns or data integrity issues
    - Providing early warning alerts`,

    "maintenance-advisor": `You are a Predictive Maintenance AI that helps optimize equipment lifecycle. You focus on:
    - Predicting when equipment needs maintenance
    - Analyzing wear patterns and degradation
    - Optimizing maintenance schedules
    - Reducing downtime and costs`,

    "ai-researcher": `You are an Advanced AI Researcher specializing in machine learning analysis of IoT data. You provide:
    - Deep learning insights and predictions
    - Complex pattern recognition
    - Advanced statistical modeling
    - Research-level analysis and recommendations`,
  }

  // Simulate data context based on selected data source
  const dataContexts = {
    "temperature-sensors":
      "Temperature sensor network with 24 devices across 3 buildings, measuring ambient and equipment temperatures every 30 seconds.",
    "humidity-sensors":
      "Humidity monitoring system with 18 sensors in climate-controlled environments, tracking moisture levels for optimal conditions.",
    "power-meters":
      "Smart power meters monitoring electrical consumption across facilities, with real-time usage and efficiency metrics.",
    "air-quality":
      "Air quality monitoring network measuring PM2.5, CO2, VOCs, and other pollutants in indoor and outdoor environments.",
    "vibration-sensors":
      "Industrial vibration sensors on rotating equipment, monitoring for mechanical issues and performance optimization.",
  }

  const systemPrompt = `${agentPrompts[agent as keyof typeof agentPrompts]}

Current Data Context: ${dataContexts[dataSource as keyof typeof dataContexts]}

When responding:
1. Provide clear, actionable insights
2. Use specific data points and metrics when possible
3. If creating visualizations, wrap the data in [VISUALIZATION] tags with JSON format
4. Always consider the business impact of your analysis
5. Be conversational but professional

For visualizations, use this format:
[VISUALIZATION]
{
  "type": "chart|metric|alert",
  "title": "Visualization Title",
  "value": 123,
  "trend": "up|down|stable",
  "status": "normal|warning|critical",
  "chartData": [...],
  "insights": ["insight 1", "insight 2"]
}
[/VISUALIZATION]`

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
  })

  return result.toDataStreamResponse()
}
