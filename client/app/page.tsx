"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { IoTSidebar } from "@/components/iot-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { DataVisualization } from "@/components/data-visualization"
import { AgentSelector } from "@/components/agent-selector"

export default function IoTChatDashboard() {
  const [selectedDataSource, setSelectedDataSource] = useState("temperature-sensors")
  const [selectedAgent, setSelectedAgent] = useState("data-analyst")
  const [visualizations, setVisualizations] = useState<any[]>([])

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: {
      dataSource: selectedDataSource,
      agent: selectedAgent,
    },
    onFinish: (message) => {
      // Parse any visualization requests from the AI response
      if (message.content.includes("[VISUALIZATION]")) {
        const vizData = extractVisualizationData(message.content)
        if (vizData) {
          setVisualizations((prev) => [...prev, vizData])
        }
      }
    },
  })

  const extractVisualizationData = (content: string) => {
    // Extract visualization data from AI response
    const vizMatch = content.match(/\[VISUALIZATION\](.*?)\[\/VISUALIZATION\]/s)
    if (vizMatch) {
      try {
        return JSON.parse(vizMatch[1])
      } catch (e) {
        return null
      }
    }
    return null
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <IoTSidebar selectedDataSource={selectedDataSource} onDataSourceChange={setSelectedDataSource} />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">IoT Intelligence Hub</h1>
                <p className="text-slate-600 dark:text-slate-400">Chat with your sensor data using AI agents</p>
              </div>
              <AgentSelector selectedAgent={selectedAgent} onAgentChange={setSelectedAgent} />
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Chat Interface */}
            <div className="flex-1 flex flex-col">
              <ChatInterface
                messages={messages}
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                selectedDataSource={selectedDataSource}
              />
            </div>

            {/* Dynamic Visualizations */}
            {visualizations.length > 0 && (
              <div className="w-1/2 border-l bg-white dark:bg-slate-900 overflow-y-auto">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Generated Insights</h3>
                </div>
                <div className="p-4 space-y-4">
                  {visualizations.map((viz, index) => (
                    <DataVisualization key={index} data={viz} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
