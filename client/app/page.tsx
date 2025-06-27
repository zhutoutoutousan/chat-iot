"use client"

import { useState, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Bot, Search } from "lucide-react"
import SensorVisualization from "@/components/sensor-visualization"
import { SensorConfig, SensorData, fetchSenseBoxInfo, fetchAllSensorData, getTimeRange, WindowResolution } from "@/lib/sensors"
import { dataProcessor } from "@/lib/data-processor"
import { TimeSpanSelector, TIME_SPAN_OPTIONS } from "@/components/time-span-selector"

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function IoTChatDashboard() {
  const [isSensorChecking, setIsSensorChecking] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [sensorConfigs, setSensorConfigs] = useState<SensorConfig[]>([])
  const [sensorData, setSensorData] = useState<{ [sensorId: string]: SensorData[] }>({})
  const [isLoadingSensorData, setIsLoadingSensorData] = useState(false)
  const [senseBoxId, setSenseBoxId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [timeSpan, setTimeSpan] = useState("7d")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [windowSize, setWindowSize] = useState<WindowResolution>('normal')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim()
    }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          timeSpan,
          dataSource: "all-sensors",
          agent: "data-analyst",
          senseBoxId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      setMessages(prev => [...prev, {
        id: data.id,
        role: data.role,
        content: data.content
      }])
    } catch (error) {
      console.error('Error in chat:', error)
      setError('Failed to get response from assistant')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTimeSpanChange = async (value: string) => {
    setTimeSpan(value)
    if (senseBoxId) {
      await fetchSensorData(value)
    }
  }

  const handleWindowSizeChange = async (size: string) => {
    console.log('[TimeSpanSelector] Window size change requested:', {
      previousSize: windowSize,
      newSize: size,
      timeSpan,
      hasSenseBoxId: !!senseBoxId
    });
    
    setWindowSize(size);
    
    if (senseBoxId) {
      // Pass the new size directly to fetchSensorData instead of waiting for state update
      await fetchSensorDataWithSize(timeSpan, size);
    }
  }

  const fetchSensorDataWithSize = async (selectedTimeSpan: string = timeSpan, currentWindowSize: string = windowSize) => {
    console.log('[fetchSensorData] Starting data fetch:', {
      selectedTimeSpan,
      currentTimeSpan: timeSpan,
      windowSize: currentWindowSize,
      senseBoxId
    });
    
    setIsLoadingSensorData(true);
    try {
      const selectedOption = TIME_SPAN_OPTIONS.find(option => option.value === selectedTimeSpan);
      if (!selectedOption) {
        console.warn('[fetchSensorData] No matching time span option found:', selectedTimeSpan);
        return;
      }

      console.log('[fetchSensorData] Fetching box info...');
      const boxInfo = await fetchSenseBoxInfo(senseBoxId);
      setSensorConfigs(boxInfo.sensors);

      const timeRange = getTimeRange(selectedOption.days);
      console.log('[fetchSensorData] Fetching raw data:', {
        selectedTimeSpan,
        days: selectedOption.days,
        timeRange,
        windowSize: currentWindowSize,
        numSensors: boxInfo.sensors.length
      });
      
      const rawData = await fetchAllSensorData(senseBoxId, boxInfo.sensors, timeRange, currentWindowSize);
      console.log('[fetchSensorData] Raw data received:', {
        numSensors: Object.keys(rawData).length,
        sampleCounts: Object.entries(rawData).reduce((acc, [id, data]) => ({
          ...acc,
          [id]: data.length
        }), {})
      });
      
      // Process data with custom aggregation
      console.log('[fetchSensorData] Processing data with aggregation:', {
        windowSize: currentWindowSize,
        timeRange
      });
      
      const processedData: { [sensorId: string]: SensorData[] } = {};
      for (const sensorId in rawData) {
        console.log(`[fetchSensorData] Processing sensor ${sensorId}:`, {
          rawDataPoints: rawData[sensorId].length,
          windowSize: currentWindowSize
        });
        
        processedData[sensorId] = dataProcessor.processData(
          rawData[sensorId],
          new Date(timeRange.fromDate),
          new Date(timeRange.toDate),
          currentWindowSize
        );
        
        console.log(`[fetchSensorData] Processed sensor ${sensorId}:`, {
          rawDataPoints: rawData[sensorId].length,
          processedDataPoints: processedData[sensorId].length,
          windowSize: currentWindowSize,
          sampleData: processedData[sensorId].slice(0, 2)
        });
      }
      
      console.log('[fetchSensorData] Setting processed data:', {
        numSensors: Object.keys(processedData).length,
        processedCounts: Object.entries(processedData).reduce((acc, [id, data]) => ({
          ...acc,
          [id]: data.length
        }), {})
      });
      
      setSensorData(processedData);
      setIsExpanded(true);
    } catch (error) {
      console.error('[fetchSensorData] Error:', error);
      setError('Failed to fetch sensor data. Please check the senseBox ID and try again.');
    } finally {
      setIsLoadingSensorData(false);
    }
  }

  const fetchSensorData = async (selectedTimeSpan: string = timeSpan) => {
    await fetchSensorDataWithSize(selectedTimeSpan, windowSize);
  }

  const handleSensorCheck = async () => {
    if (!senseBoxId.trim()) {
      setError("Please enter a senseBox ID")
      return
    }

    setError(null)
    setIsSensorChecking(true)
    await fetchSensorData()
    setIsSensorChecking(false)
  }

  const handleFocus = () => {
    setIsExpanded(true)
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <main className="min-h-screen w-screen bg-white text-slate-900 overflow-x-hidden">
        <div className={`w-full min-h-screen flex flex-col transition-all duration-300`}>
          {/* Fixed Header Area */}
          <div className="w-full bg-white sticky top-0 z-10 pt-8 pb-4 px-6">
            <div className="max-w-[800px] mx-auto">
              {/* Logo Area */}
              <div className="flex items-center gap-3 mb-8">
                <Bot className="w-12 h-12 text-blue-500" />
                <h1 className="text-3xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  MhatIoT
                </h1>
              </div>

              {/* Search Area */}
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

                {/* SenseBox ID Input and Check Button */}
                <div className="w-full mt-6 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={senseBoxId}
                      onChange={(e) => setSenseBoxId(e.target.value)}
                      placeholder="Enter senseBox ID..."
                      className="flex-1"
                      disabled={isSensorChecking || isLoadingSensorData}
                    />
                    <TimeSpanSelector
                      value={timeSpan}
                      onValueChange={handleTimeSpanChange}
                      onWindowSizeChange={handleWindowSizeChange}
                      className="w-48"
                      disabled={isSensorChecking || isLoadingSensorData}
                    />
                    <Button
                      onClick={handleSensorCheck}
                      disabled={isSensorChecking || isLoadingSensorData || !senseBoxId.trim()}
                      className={`
                        px-8 py-2.5
                        rounded-full 
                        font-medium
                        text-base
                        transition-all
                        duration-300
                        ${(isSensorChecking || isLoadingSensorData)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }
                      `}
                    >
                      {(isSensorChecking || isLoadingSensorData) ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                          Checking Sensors...
                        </div>
                      ) : (
                        'Check Sensors'
                      )}
                    </Button>
                  </div>
                  {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 w-full px-6 pb-8">
            <div className="max-w-[800px] mx-auto space-y-6">
              {/* Messages Area */}
              {(messages.length > 0 || isLoading) && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <ChatInterface
                    messages={messages}
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    selectedDataSource="all-sensors"
                    sensorConfigs={sensorConfigs}
                    currentSensorData={sensorData}
                  />
                </div>
              )}

              {/* Sensor Visualization Area */}
              {(Object.keys(sensorData).length > 0 || isLoadingSensorData) && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <SensorVisualization
                    sensorConfigs={sensorConfigs}
                    sensorData={sensorData}
                    isLoading={isLoadingSensorData}
                    senseBoxId={senseBoxId}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </SidebarProvider>
  )
}
