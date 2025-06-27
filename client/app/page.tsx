"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Bot, Search } from "lucide-react"
import SensorVisualization  from "@/components/sensor-visualization"

interface SensorData {
  location: [number, number];
  createdAt: string;
  value: string;
}

export default function IoTChatDashboard() {
  const [isSensorChecking, setIsSensorChecking] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [sensorData, setSensorData] = useState<SensorData[]>([])
  const [isLoadingSensorData, setIsLoadingSensorData] = useState(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: {
      dataSource: "all-sensors",
      agent: "data-analyst",
    }
  })

  const handleSensorCheck = async () => {
    setIsSensorChecking(true)
    setIsLoadingSensorData(true)
    try {
      const response = await fetch('https://api.opensensemap.org/boxes/67f90bb3806ae700072ac06d/data/67ff9614bd73080008fa6dc9?format=json&from-date=2025-04-11T12:00:00Z&to-date=2025-04-17T15:59:59Z');
      const data = await response.json();
      setSensorData(data);
      setIsExpanded(true);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    } finally {
      setIsLoadingSensorData(false);
      setIsSensorChecking(false);
    }
  }

  const handleFocus = () => {
    setIsExpanded(true)
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <main className="min-h-screen w-screen bg-white text-slate-900 flex items-center justify-center">
        <div className={`w-full ${isExpanded ? 'h-screen pt-8' : 'h-screen'} flex flex-col items-center justify-center transition-all duration-300`}>
          {/* Logo Area */}
          <div className={`flex items-center gap-3 mb-8 ${isExpanded ? 'transform -translate-y-20' : ''} transition-all duration-300`}>
            <Bot className="w-12 h-12 text-blue-500" />
            <h1 className="text-3xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              MhatIoT
            </h1>
          </div>

          {/* Search Area */}
          <div className="w-full max-w-[800px] px-6">
            <div className="relative flex flex-col items-center">
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit(e)
                  setIsExpanded(true)
                }}
                className="relative w-full"
              >
                <Input
                  value={input}
                  onChange={handleInputChange}
                  onFocus={handleFocus}
                  placeholder="Ask about your IoT sensors..."
                  className="w-full h-14 pl-14 pr-14 rounded-full border-2 border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 shadow-sm hover:shadow-md transition-all text-lg"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-4 rounded-full bg-transparent hover:bg-slate-100 text-blue-500"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>

              {/* Sensor Check Button */}
              <Button
                onClick={handleSensorCheck}
                disabled={isSensorChecking || isLoading}
                className={`
                  mt-6
                  px-8 py-2.5
                  rounded-full 
                  font-medium
                  text-base
                  transition-all
                  duration-300
                  ${isSensorChecking || isLoading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }
                `}
              >
                {isSensorChecking ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    Checking Sensors...
                  </div>
                ) : (
                  'Check Sensors'
                )}
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className={`w-full max-w-[800px] px-6 mt-8 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            {/* Messages Area */}
            {(messages.length > 0 || isLoading) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
                <ChatInterface
                  messages={messages}
                  input={input}
                  handleInputChange={handleInputChange}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                  selectedDataSource="all-sensors"
                />
              </div>
            )}

            {/* Sensor Visualization Area */}
            {(sensorData.length > 0 || isLoadingSensorData) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <SensorVisualization
                  data={sensorData}
                  isLoading={isLoadingSensorData}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </SidebarProvider>
  )
}
