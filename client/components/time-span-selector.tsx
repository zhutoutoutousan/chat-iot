import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Clock, Gauge } from "lucide-react"
import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface TimeSpanOption {
  value: string
  label: string
  days: number
}

export interface WindowSize {
  value: string
  label: string
  description: string
}

export const WINDOW_SIZES: WindowSize[] = [
  { 
    value: 'highest',
    label: 'Highest Resolution',
    description: '5min intervals for 24h, 15min for week, hourly for month'
  },
  { 
    value: 'high',
    label: 'High Resolution',
    description: '15min intervals for 24h, hourly for week, 3h for month'
  },
  { 
    value: 'normal',
    label: 'Normal Resolution',
    description: '30min intervals for 24h, 3h for week, 6h for month'
  },
  { 
    value: 'low',
    label: 'Low Resolution',
    description: 'Hourly for 24h, 6h for week, 12h for month'
  },
  { 
    value: 'lowest',
    label: 'Lowest Resolution',
    description: '2h intervals for 24h, 12h for week, daily for month'
  },
  { 
    value: 'minimal',
    label: 'Minimal Resolution',
    description: '3h intervals for 24h, daily for week, 2 days for month'
  }
]

const TIME_SPAN_OPTIONS: TimeSpanOption[] = [
  { value: "1d", label: "Last 24 Hours", days: 1 },
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
]

interface TimeSpanSelectorProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  disabled?: boolean
  onWindowSizeChange?: (size: string) => void
}

type IntervalUnit = 'm' | 'h' | 'd';

export function TimeSpanSelector({ 
  value, 
  onValueChange, 
  className, 
  disabled,
  onWindowSizeChange 
}: TimeSpanSelectorProps) {
  const [windowSize, setWindowSize] = useState('normal')
  const [customInterval, setCustomInterval] = useState('')
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('m')
  const [activeTab, setActiveTab] = useState('prescriptive')

  // Load saved window size preference only once on mount
  useEffect(() => {
    const savedSize = localStorage.getItem('preferred-window-size')
    if (savedSize) {
      if (/^\d+[mhd]$/.test(savedSize)) {
        const unit = savedSize.slice(-1) as IntervalUnit
        setCustomInterval(savedSize.slice(0, -1))
        setIntervalUnit(unit)
        setActiveTab('custom')
        setWindowSize('custom')
      } else {
        setWindowSize(savedSize)
        setActiveTab('prescriptive')
      }
      // Only call onWindowSizeChange if the saved size is different from default
      if (savedSize !== 'normal') {
        onWindowSizeChange?.(savedSize)
      }
    }
  }, []) // Empty dependency array to run only once on mount

  const handleWindowSizeChange = (newSize: string) => {
    setWindowSize(newSize)
    localStorage.setItem('preferred-window-size', newSize)
    onWindowSizeChange?.(newSize)
  }

  const handleCustomIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setCustomInterval(value)
    if (value) {
      const interval = `${value}${intervalUnit}`
      setWindowSize('custom')
      localStorage.setItem('preferred-window-size', interval)
      onWindowSizeChange?.(interval)
    }
  }

  const handleUnitChange = (unit: IntervalUnit) => {
    setIntervalUnit(unit)
    if (customInterval) {
      const interval = `${customInterval}${unit}`
      localStorage.setItem('preferred-window-size', interval)
      onWindowSizeChange?.(interval)
    }
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <SelectValue placeholder="Select time span" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {TIME_SPAN_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0 relative"
            disabled={disabled}
          >
            <Gauge className="h-4 w-4" />
            <span className="sr-only">Select data resolution</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Data Resolution</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Choose between preset resolutions or set a custom interval.
              </p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prescriptive">Preset</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
              
              <TabsContent value="prescriptive" className="mt-4">
                <RadioGroup value={windowSize} onValueChange={handleWindowSizeChange}>
                  {WINDOW_SIZES.map((size) => (
                    <div key={size.value} className="flex items-start space-x-3 space-y-1">
                      <RadioGroupItem value={size.value} id={size.value} />
                      <Label htmlFor={size.value} className="font-normal">
                        <div className="text-sm font-medium">{size.label}</div>
                        <div className="text-xs text-muted-foreground">{size.description}</div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </TabsContent>
              
              <TabsContent value="custom" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-interval">Custom Interval</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-interval"
                      type="text"
                      value={customInterval}
                      onChange={handleCustomIntervalChange}
                      placeholder="Enter number"
                      className="flex-1"
                    />
                    <Select value={intervalUnit} onValueChange={handleUnitChange}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">Minutes</SelectItem>
                        <SelectItem value="h">Hours</SelectItem>
                        <SelectItem value="d">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the interval between each data point. Smaller intervals show more detail but load slower.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { TIME_SPAN_OPTIONS } 