export interface SensorConfig {
  id: string;
  name: string;
  unit: string;
  color: string;
  sensorType: string;
  lastMeasurement?: {
    value: string;
    createdAt: string;
  };
}

export interface SensorData {
  location: [number, number];
  createdAt: string;
  value: string;
  sensorId: string;
}

export interface SensorDataGroup {
  [sensorId: string]: SensorData[];
}

export interface SenseBox {
  _id: string;
  name: string;
  exposure: string;
  currentLocation: {
    coordinates: [number, number];
    timestamp: string;
    type: string;
  };
  sensors: Array<{
    _id: string;
    title: string;
    unit: string;
    sensorType: string;
    lastMeasurement?: {
      value: string;
      createdAt: string;
    };
  }>;
  updatedAt: string;
  createdAt: string;
}

export const SENSEBOX_ID = '67f90bb3806ae700072ac06d';

// Color palette for sensors
const SENSOR_COLORS = [
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#45B7D1', // blue
  '#FFE66D', // yellow
  '#95A5A6', // gray
  '#E17055', // orange
  '#00CEC9', // cyan
  '#74B9FF', // light blue
  '#A8E6CF', // mint
  '#FFB6B9'  // pink
];

export async function fetchSenseBoxInfo(boxId: string): Promise<{
  sensors: SensorConfig[];
  location: [number, number];
  name: string;
}> {
  const url = `https://api.opensensemap.org/boxes/${boxId}`;
  
  try {
    const response = await fetch(url);
    console.log('SenseBox response:', response);
    
    if (!response.ok) {
      console.error('API Error:', await response.text());
      throw new Error(`Failed to fetch senseBox info: ${response.status}`);
    }
    
    const box: SenseBox = await response.json();
    console.log('SenseBox data:', box);

    // Map sensors to SensorConfig format with colors
    const sensors = box.sensors.map((sensor, index) => ({
      id: sensor._id,
      name: sensor.title,
      unit: sensor.unit,
      color: SENSOR_COLORS[index % SENSOR_COLORS.length],
      sensorType: sensor.sensorType,
      lastMeasurement: sensor.lastMeasurement
    }));

    return {
      sensors,
      location: box.currentLocation.coordinates,
      name: box.name
    };
  } catch (error) {
    console.error('Error fetching senseBox info:', error);
    throw error;
  }
}

export interface TimeRange {
  fromDate: string;
  toDate: string;
}

export function getTimeRange(days: number = 7): TimeRange {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - days);
  
  return {
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString()
  };
}

export function parseCustomTimeRange(from: string, to: string): TimeRange | null {
  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return null;
    }

    return {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString()
    };
  } catch (error) {
    console.error('Error parsing date range:', error);
    return null;
  }
}

export async function fetchAllSensorData(
  boxId: string,
  sensors: SensorConfig[], 
  timeRange: TimeRange
): Promise<SensorDataGroup> {
  // Initialize the result object with empty arrays for each sensor
  const result: SensorDataGroup = {};
  sensors.forEach(sensor => {
    result[sensor.id] = [];
  });

  try {
    // Fetch data for each sensor individually using the correct endpoint
    const promises = sensors.map(async (sensor) => {
      // Using the correct endpoint format: /boxes/:boxId/data/:sensorId
      const url = `https://api.opensensemap.org/boxes/${boxId}/data/${sensor.id}?from-date=${encodeURIComponent(timeRange.fromDate)}&to-date=${encodeURIComponent(timeRange.toDate)}`;
      
      console.log(`Fetching data for sensor ${sensor.name}:`, url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error for sensor ${sensor.name}:`, errorText);
        return;
      }
      
      const measurements = await response.json();
      console.log(`Received data for sensor ${sensor.name}:`, measurements);
      
      if (Array.isArray(measurements)) {
        result[sensor.id] = measurements.map(m => ({
          value: m.value,
          createdAt: m.createdAt,
          location: m.location || [0, 0],
          sensorId: sensor.id
        }));
      }
    });

    await Promise.all(promises);
    return result;
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    throw error;
  }
}

export function formatSensorValue(value: string, unit: string): string {
  const numValue = parseFloat(value);
  return `${numValue.toFixed(2)}${unit}`;
} 