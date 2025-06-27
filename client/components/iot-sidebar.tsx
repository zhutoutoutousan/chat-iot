"use client"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Thermometer, Droplets, Zap, Wind, Activity, Database, Wifi, AlertTriangle } from "lucide-react"

interface IoTSidebarProps {
  selectedDataSource: string
  onDataSourceChange: (source: string) => void
}

export function IoTSidebar({ selectedDataSource, onDataSourceChange }: IoTSidebarProps) {
  const dataSources = [
    {
      id: "temperature-sensors",
      name: "Temperature Sensors",
      icon: Thermometer,
      count: 24,
      status: "active",
      lastUpdate: "2 min ago",
    },
    {
      id: "humidity-sensors",
      name: "Humidity Sensors",
      icon: Droplets,
      count: 18,
      status: "active",
      lastUpdate: "1 min ago",
    },
    {
      id: "power-meters",
      name: "Power Meters",
      icon: Zap,
      count: 12,
      status: "warning",
      lastUpdate: "5 min ago",
    },
    {
      id: "air-quality",
      name: "Air Quality",
      icon: Wind,
      count: 8,
      status: "active",
      lastUpdate: "3 min ago",
    },
    {
      id: "vibration-sensors",
      name: "Vibration Sensors",
      icon: Activity,
      count: 16,
      status: "active",
      lastUpdate: "1 min ago",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="font-semibold">Data Sources</h2>
            <p className="text-xs text-muted-foreground">Live sensor feeds</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Active Sensors</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataSources.map((source) => {
                const Icon = source.icon
                return (
                  <SidebarMenuItem key={source.id}>
                    <SidebarMenuButton
                      isActive={selectedDataSource === source.id}
                      onClick={() => onDataSourceChange(source.id)}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{source.name}</span>
                          <span className="text-xs text-muted-foreground">{source.count} devices</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(source.status)}`} />
                        <Badge variant="secondary" className="text-xs">
                          {source.lastUpdate}
                        </Badge>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>System Status</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  Network
                </span>
                <Badge variant="outline" className="text-green-600">
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  Storage
                </span>
                <Badge variant="outline">2.4TB / 5TB</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Alerts
                </span>
                <Badge variant="outline" className="text-yellow-600">
                  3 Active
                </Badge>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          <p>Data ingestion rate:</p>
          <p className="font-mono text-green-600">~2.3GB/hour</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
