import { Message } from 'ai';
import { createChatCompletion } from '@/lib/deepseek';
import { dataProcessor } from '@/lib/data-processor';
import { fetchAllSensorData, fetchSenseBoxInfo, getTimeRange, SensorConfig, SensorDataGroup } from '@/lib/sensors';

export const runtime = 'edge';

interface ProcessedDataGroup {
  [sensorId: string]: any[];
}

export async function POST(req: Request) {
  const body = await req.json();
  console.log('Received body:', body);
  const messages = body.messages || [];
  const dataSource = (body.dataSource ?? body.body?.dataSource) || 'all-sensors';
  const timeSpan = (body.timeSpan ?? body.body?.timeSpan) || '7d';
  const agent = (body.agent ?? body.body?.agent) || 'data-analyst';
  const senseBoxId = body.senseBoxId ?? body.body?.senseBoxId;

  // Get the last message content
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    return new Response(
      JSON.stringify({ error: 'No message provided' }),
      { status: 400 }
    );
  }

  const userQuery = lastMessage.content;

  try {
    // If no senseBox is selected, provide a general response
    if (!senseBoxId) {
      const contextMessage: Message = {
        role: 'system',
        content: `You are an IoT sensor data analyst assistant. Currently, no sensor box is selected. 
        Guide the user to:
        1. Enter a senseBox ID in the input field
        2. Click the "Check Sensors" button to load sensor data
        3. Once data is loaded, you can help analyze the sensor readings

        Respond to the user's query with this context in mind.`,
        id: 'context'
      };

      const augmentedMessages = [contextMessage, ...messages];
      const response = await createChatCompletion(augmentedMessages);

      return new Response(
        JSON.stringify({ 
          role: 'assistant', 
          content: response,
          id: `assistant-${Date.now()}`
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse time span and get appropriate time range
    const days = parseInt(timeSpan?.replace('d', '') || '7');
    console.log('Processing time span:', { timeSpan, days });
    const timeRange = getTimeRange(days);
    
    const boxInfo = await fetchSenseBoxInfo(senseBoxId);
    console.log('Fetching data with time range:', { timeSpan, days, timeRange });
    const rawData = await fetchAllSensorData(senseBoxId, boxInfo.sensors, timeRange);

    // Process data with appropriate aggregation based on time range
    const aggregationType = determineAggregationType(timeRange);
    const processedData: ProcessedDataGroup = {};
    
    // If dataSource is a specific sensor ID, only process that sensor's data
    const targetSensors = dataSource === 'all-sensors' 
      ? boxInfo.sensors 
      : boxInfo.sensors.filter(s => s.id === dataSource);

    for (const sensor of targetSensors) {
      const sensorData = rawData[sensor.id];
      if (sensorData) {
        processedData[sensor.id] = dataProcessor.processData(
          sensorData,
          new Date(timeRange.fromDate),
          new Date(timeRange.toDate),
          aggregationType
        );
      }
    }

    // Prepare context for the AI
    const dataContext = prepareDataContext(processedData, boxInfo, timeRange, dataSource);
    
    // Add context to the messages
    const contextMessage: Message = {
      role: 'system',
      content: `You are analyzing IoT sensor data with the following context:\n${dataContext}\n\nRespond to the user's query about this data. ${
        dataSource !== 'all-sensors' 
          ? `Focus specifically on the ${boxInfo.sensors.find(s => s.id === dataSource)?.name} sensor.`
          : ''
      }`,
      id: 'context'
    };

    const augmentedMessages = [contextMessage, ...messages];

    // Get streaming response from AI
    const response = await createChatCompletion(augmentedMessages);

    // Return response
    return new Response(
      JSON.stringify({ 
        role: 'assistant', 
        content: response,
        id: `assistant-${Date.now()}`
      }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500 }
    );
  }
}

function determineAggregationType(timeRange: { fromDate: string; toDate: string }): 'raw' | 'hourly' | 'daily' {
  const start = new Date(timeRange.fromDate);
  const end = new Date(timeRange.toDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  // Enforce 30-day limit
  if (daysDiff > 30) {
    console.warn('Time range exceeding 30 days is not supported. Limiting to 30 days.');
    return 'daily';
  }

  if (daysDiff <= 1) return 'raw';
  if (daysDiff <= 7) return 'hourly';
  return 'daily';
}

function prepareDataContext(
  processedData: ProcessedDataGroup,
  boxInfo: { name: string; location: [number, number]; sensors: SensorConfig[] },
  timeRange: { fromDate: string; toDate: string },
  dataSource: string
): string {
  const relevantSensors = dataSource === 'all-sensors'
    ? boxInfo.sensors
    : boxInfo.sensors.filter(s => s.id === dataSource);

  const sensorSummaries = relevantSensors.map(sensor => {
    const sensorData = processedData[sensor.id] || [];
    const latestValue = sensorData[sensorData.length - 1]?.value;
    const avgValue = calculateAverage(sensorData);
    const minValue = calculateMin(sensorData);
    const maxValue = calculateMax(sensorData);

    return `${sensor.name} (${sensor.unit}):
    - Latest: ${latestValue}
    - Average: ${avgValue}
    - Minimum: ${minValue}
    - Maximum: ${maxValue}
    - Data points: ${sensorData.length}`;
  }).join('\n\n');

  return `Box: ${boxInfo.name}
Location: ${boxInfo.location.join(', ')}
Time range: ${timeRange.fromDate} to ${timeRange.toDate}
${dataSource === 'all-sensors' ? 'Analyzing all sensors' : `Focusing on ${relevantSensors[0]?.name} sensor`}

Sensor Summaries:
${sensorSummaries}`;
}

function calculateAverage(data: any[]): string {
  if (!data || data.length === 0) return 'N/A';
  const sum = data.reduce((acc, item) => acc + parseFloat(item.value), 0);
  return (sum / data.length).toFixed(2);
}

function calculateMin(data: any[]): string {
  if (!data || data.length === 0) return 'N/A';
  const min = Math.min(...data.map(item => parseFloat(item.value)));
  return min.toFixed(2);
}

function calculateMax(data: any[]): string {
  if (!data || data.length === 0) return 'N/A';
  const max = Math.max(...data.map(item => parseFloat(item.value)));
  return max.toFixed(2);
}
