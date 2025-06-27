import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SensorConfig, SensorData, SensorDataGroup, TimeRange, fetchSenseBoxInfo, fetchAllSensorData, getTimeRange, parseCustomTimeRange, formatSensorValue } from '../lib/sensors';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface BoxInfo {
  sensors: SensorConfig[];
  location: [number, number];
  name: string;
}

export default function SensorVisualization() {
  const [boxId, setBoxId] = useState<string>('');
  const [boxInfo, setBoxInfo] = useState<BoxInfo | null>(null);
  const [sensorData, setSensorData] = useState<SensorDataGroup>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(getTimeRange(7));
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');

  const handleBoxIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxId.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const info = await fetchSenseBoxInfo(boxId);
      setBoxInfo(info);
      await fetchData(info.sensors);
    } catch (err) {
      console.error('Error fetching box info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch box information');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { from, to } = customDateRange;
    const parsedRange = parseCustomTimeRange(from, to);
    
    if (!parsedRange) {
      setError('Invalid date range format. Please use YYYY-MM-DD format.');
      return;
    }

    setTimeRange(parsedRange);
    if (boxInfo) {
      await fetchData(boxInfo.sensors, parsedRange);
    }
  };

  const handlePresetRange = async (days: number) => {
    const newRange = getTimeRange(days);
    setTimeRange(newRange);
    if (boxInfo) {
      await fetchData(boxInfo.sensors, newRange);
    }
  };

  const fetchData = async (sensors: SensorConfig[], range: TimeRange = timeRange) => {
    if (!boxId || sensors.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching data for range:', range);
      
      const data = await fetchAllSensorData(boxId, sensors, range);
      console.log('Received sensor data:', data);
      
      // Validate that we have data for at least one sensor
      const hasData = Object.values(data).some(sensorData => sensorData && sensorData.length > 0);
      if (!hasData) {
        setError('No sensor data available for the selected time range');
        return;
      }
      
      setSensorData(data);
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sensor data');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newMessage: ChatMessage = { role: 'user', content: userInput };
    setChatMessages(prev => [...prev, newMessage]);
    setUserInput('');

    const response = analyzeUserQuery(userInput, sensorData);
    setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
  };

  const analyzeUserQuery = (query: string, data: SensorDataGroup): string => {
    if (!boxInfo) return "Please enter a senseBox ID first.";

    const queryLower = query.toLowerCase();
    let response = '';

    // Find matching sensor by name
    const matchingSensor = boxInfo.sensors.find(s => 
      queryLower.includes(s.name.toLowerCase()) || 
      (s.name.toLowerCase().includes('temperature') && queryLower.includes('temperature')) ||
      (s.name.toLowerCase().includes('humidity') && queryLower.includes('humidity'))
    );

    if (matchingSensor) {
      const sensorData = data[matchingSensor.id];
      if (sensorData?.length) {
        const latest = sensorData[sensorData.length - 1];
        response = `Current ${matchingSensor.name} is ${formatSensorValue(latest.value, matchingSensor.unit)}`;
      } else if (matchingSensor.lastMeasurement) {
        response = `Latest ${matchingSensor.name} reading was ${formatSensorValue(matchingSensor.lastMeasurement.value, matchingSensor.unit)} at ${new Date(matchingSensor.lastMeasurement.createdAt).toLocaleString()}`;
      } else {
        response = `No ${matchingSensor.name.toLowerCase()} data available`;
      }
    } else {
      response = `I can help you analyze sensor data. Try asking about any of these sensors: ${boxInfo.sensors.map(s => s.name).join(', ')}`;
    }

    return response;
  };

  const formatChartData = (data: SensorDataGroup) => {
    if (!data || Object.keys(data).length === 0) {
      console.log('No data available for chart formatting');
      return [];
    }

    // Find the first sensor that has data
    const sensorWithData = Object.entries(data).find(([_, measurements]) => measurements && measurements.length > 0);
    if (!sensorWithData) {
      console.log('No sensor has data available');
      return [];
    }

    const [firstSensorId, firstSensorData] = sensorWithData;
    console.log(`Using sensor ${firstSensorId} as reference for time points`);

    return firstSensorData.map((_, index) => {
      const point: Record<string, any> = {
        timestamp: new Date(firstSensorData[index].createdAt).toLocaleString(),
      };
      
      if (boxInfo) {
        boxInfo.sensors.forEach(sensor => {
          const sensorData = data[sensor.id];
          if (sensorData?.[index]) {
            const value = parseFloat(sensorData[index].value);
            if (!isNaN(value)) {
              point[sensor.name] = value;
            }
          }
        });
      }
      
      return point;
    });
  };

  if (loading && !boxInfo) return <div>Loading box information...</div>;
  if (loading) return <div>Loading sensor data...</div>;

  const chartData = formatChartData(sensorData);

  return (
    <div className="space-y-4 p-4">
      <Card className="p-4">
        <form onSubmit={handleBoxIdSubmit} className="flex gap-2">
          <Input
            value={boxId}
            onChange={(e) => setBoxId(e.target.value)}
            placeholder="Enter senseBox ID..."
            className="flex-1"
          />
          <Button type="submit">Load Box</Button>
        </form>
      </Card>

      {error && (
        <Card className="p-4 bg-red-50">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {boxInfo && (
        <>
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-2">{boxInfo.name}</h2>
            <p className="text-gray-600">Location: {boxInfo.location.join(', ')}</p>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">Select Time Range</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => handlePresetRange(1)}
                  variant={timeRange === getTimeRange(1) ? "default" : "outline"}
                >
                  24 Hours
                </Button>
                <Button
                  onClick={() => handlePresetRange(7)}
                  variant={timeRange === getTimeRange(7) ? "default" : "outline"}
                >
                  7 Days
                </Button>
                <Button
                  onClick={() => handlePresetRange(30)}
                  variant={timeRange === getTimeRange(30) ? "default" : "outline"}
                >
                  30 Days
                </Button>
              </div>
              
              <form onSubmit={handleDateRangeSubmit} className="flex gap-2">
                <Input
                  type="date"
                  value={customDateRange.from}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={customDateRange.to}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="flex-1"
                />
                <Button type="submit">Apply Range</Button>
              </form>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Sensor Measurements</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {boxInfo.sensors.map(sensor => (
                    <Line
                      key={sensor.id}
                      type="monotone"
                      dataKey={sensor.name}
                      stroke={sensor.color}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Current Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boxInfo.sensors.map(sensor => {
                const sensorValues = sensorData[sensor.id];
                const latestData = sensorValues && sensorValues.length > 0 
                  ? sensorValues[sensorValues.length - 1]
                  : sensor.lastMeasurement;
                
                return (
                  <Card key={sensor.id} className="p-4">
                    <h3 className="font-semibold">{sensor.name}</h3>
                    <p className="text-sm text-gray-600">{sensor.sensorType}</p>
                    {latestData ? (
                      <>
                        <p className="text-2xl">
                          {formatSensorValue(latestData.value, sensor.unit)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Last updated: {new Date(latestData.createdAt).toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">No data available</p>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Chat with Your Data</h2>
            <div className="space-y-4">
              <div className="h-[200px] overflow-y-auto space-y-2">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded ${
                      msg.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about your sensor data..."
                  className="flex-1"
                />
                <Button type="submit">Send</Button>
              </form>
            </div>
          </Card>
        </>
      )}
    </div>
  );
} 