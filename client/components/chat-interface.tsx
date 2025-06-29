"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Sparkles } from "lucide-react"
import { SensorConfig, SensorData } from "@/lib/sensors"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  selectedDataSource: string
  sensorConfigs?: SensorConfig[]
  currentSensorData?: { [sensorId: string]: SensorData[] }
}

export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  selectedDataSource,
  sensorConfigs = [],
  currentSensorData = {}
}: ChatInterfaceProps) {
  // Generate suggested queries based on available sensors
  const suggestedQueries = sensorConfigs.length > 0 
    ? [
        ...sensorConfigs.map(sensor => `What's the current ${sensor.name}?`),
        "Show me temperature trends for the last 24 hours",
        "Which sensors are showing anomalies?",
        "Compare measurements across all sensors",
        "What's the correlation between different measurements?",
      ]
    : [
        "Show me temperature trends for the last 24 hours",
        "Which sensors are showing anomalies?",
        "Compare power consumption across buildings",
        "Generate a predictive maintenance report",
        "What's the correlation between humidity and temperature?",
      ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Welcome to IoT Intelligence Hub</h3>
              <p className="text-muted-foreground mb-6">
                Ask me anything about your sensor data. I can analyze trends, detect anomalies, and generate insights
                from your IoT ecosystem.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {suggestedQueries.map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-left justify-start h-auto p-3 bg-transparent"
                    onClick={() => {
                      const event = new Event("submit") as any
                      event.preventDefault = () => {}
                      handleInputChange({ target: { value: query } } as any)
                      setTimeout(() => handleSubmit(event), 100)
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white dark:bg-slate-800 border shadow-sm prose dark:prose-invert prose-sm max-w-none"
                }`}
              >
                {message.role === "user" ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="mb-2 list-disc pl-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="mb-2 list-decimal pl-4" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2" {...props} />,
                      code: ({node, inline, ...props}) => 
                        inline 
                          ? <code className="bg-slate-100 dark:bg-slate-700 rounded px-1" {...props} />
                          : <code className="block bg-slate-100 dark:bg-slate-700 rounded p-2 my-2" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-slate-100 dark:bg-slate-700 rounded p-2 my-2 overflow-x-auto" {...props} />,
                      table: ({node, ...props}) => <table className="min-w-full border border-slate-200 dark:border-slate-700 my-2" {...props} />,
                      th: ({node, ...props}) => <th className="border border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-800" {...props} />,
                      td: ({node, ...props}) => <td className="border border-slate-200 dark:border-slate-700 px-4 py-2" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border shadow-sm rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">Analyzing sensor data...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-2">
            <Badge variant="outline" className="text-xs">
              Active: {selectedDataSource.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Badge>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your sensor data..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
