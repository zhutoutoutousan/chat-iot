import { Card } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SensorConfig, SensorData } from '@/lib/sensors';
import { Button } from './ui/button';
import { MessageCircle } from 'lucide-react';
import { ChatInterface } from './chat-interface';
import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SensorVisualizationProps {
  sensorConfigs: SensorConfig[];
  sensorData: { [sensorId: string]: SensorData[] };
  isLoading: boolean;
  senseBoxId: string;
}

export default function SensorVisualization({
  sensorConfigs,
  sensorData,
  isLoading,
  senseBoxId
}: SensorVisualizationProps) {
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          body: {
            dataSource: selectedSensor || "all-sensors",
            agent: "data-analyst",
            senseBoxId
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        id: data.id,
        role: data.role,
        content: data.content
      }]);
    } catch (error) {
      console.error('Error in chat:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading sensor data...</div>;
  }

  const formatChartData = (sensorId: string) => {
    console.log(`Formatting data for sensor ${sensorId}:`, sensorData[sensorId]);
    const data = sensorData[sensorId];
    if (!data || data.length === 0) return [];

    return data.map(point => {
      // Parse the date and ensure it's valid
      const date = new Date(point.createdAt);
      return {
        timestamp: date instanceof Date && !isNaN(date.getTime()) 
          ? date.toLocaleString()
          : point.createdAt, // Fallback to raw string if date is invalid
        value: parseFloat(point.value)
      };
    });
  };

  // Reset messages when switching sensors
  const handleSensorSelect = (sensorId: string | null) => {
    setSelectedSensor(sensorId);
    setMessages([]);
    setInput("");
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-6">
        {sensorConfigs.map(sensor => {
          console.log(`Processing sensor ${sensor.name} (${sensor.id})`);
          const chartData = formatChartData(sensor.id);
          console.log(`Chart data for ${sensor.name}:`, chartData);
          const latestData = chartData[chartData.length - 1];

          return (
            <Card key={sensor.id} className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{sensor.name}</h2>
                  <p className="text-sm text-gray-600">{sensor.sensorType}</p>
                  {latestData && (
                    <p className="text-2xl mt-2">
                      {latestData.value.toFixed(2)} {sensor.unit}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => handleSensorSelect(selectedSensor === sensor.id ? null : sensor.id)}
                >
                  <MessageCircle className="h-4 w-4" />
                  {selectedSensor === sensor.id ? 'Hide Chat' : 'Chat'}
                </Button>
              </div>

              <div className="h-[300px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={sensor.color || "#2563eb"}
                      dot={false}
                      name={sensor.name}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {selectedSensor === sensor.id && (
                <div className="mt-4 border-t pt-4">
                  <ChatInterface
                    messages={messages}
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isChatLoading}
                    selectedDataSource={sensor.id}
                    sensorConfigs={[sensor]}
                    currentSensorData={{ [sensor.id]: sensorData[sensor.id] }}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
} 