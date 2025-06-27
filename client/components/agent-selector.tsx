"use client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Brain, BarChart3, AlertTriangle, Wrench } from "lucide-react"

interface AgentSelectorProps {
  selectedAgent: string
  onAgentChange: (agent: string) => void
}

export function AgentSelector({ selectedAgent, onAgentChange }: AgentSelectorProps) {
  const agents = [
    {
      id: "data-analyst",
      name: "Data Analyst",
      icon: BarChart3,
      description: "Analyzes trends and patterns in sensor data",
      color: "blue",
    },
    {
      id: "anomaly-detector",
      name: "Anomaly Detective",
      icon: AlertTriangle,
      description: "Identifies unusual patterns and potential issues",
      color: "yellow",
    },
    {
      id: "maintenance-advisor",
      name: "Maintenance Advisor",
      icon: Wrench,
      description: "Provides predictive maintenance insights",
      color: "green",
    },
    {
      id: "ai-researcher",
      name: "AI Researcher",
      icon: Brain,
      description: "Advanced ML analysis and predictions",
      color: "purple",
    },
  ]

  const currentAgent = agents.find((agent) => agent.id === selectedAgent)
  const Icon = currentAgent?.icon || Brain

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <Icon className="h-4 w-4" />
          <span>{currentAgent?.name || "Select Agent"}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {agents.map((agent) => {
          const AgentIcon = agent.icon
          return (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => onAgentChange(agent.id)}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className={`p-2 rounded-lg bg-${agent.color}-100 dark:bg-${agent.color}-900`}>
                <AgentIcon className={`h-4 w-4 text-${agent.color}-600`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{agent.name}</span>
                  {selectedAgent === agent.id && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{agent.description}</p>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
