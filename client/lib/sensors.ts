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
    
    if (!response.ok) {
      throw new Error(`Failed to fetch senseBox info: ${response.status}`);
    }
    
    const box: SenseBox = await response.json();

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

export type WindowResolution = 'highest' | 'high' | 'normal' | 'low' | 'lowest' | 'minimal' | string;
export type TimeRange = {
  fromDate: string;
  toDate: string;
};

export function getTimeRange(days: number = 7): TimeRange {
  // Enforce 30-day limit
  if (days > 30) {
    console.warn('Time range exceeding 30 days is not supported by the API. Limiting to 30 days.');
    days = 30;
  }
  
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

export function getWindowSize(daysDiff: number, resolution: WindowResolution = 'normal'): string {
  // If resolution is a custom interval value (e.g. "10m", "2h", "1d"), return it directly
  if (typeof resolution === 'string' && /^\d+[mhd]$/.test(resolution)) {
    return resolution;
  }

  // Base window sizes
  const windowSizes = {
    '1d': {
      highest: '5m',    // Every 5 minutes
      high: '15m',      // Every 15 minutes
      normal: '30m',    // Every 30 minutes
      low: '1h',        // Every hour
      lowest: '2h',     // Every 2 hours
      minimal: '3h'     // Every 3 hours
    },
    '7d': {
      highest: '15m',   // Every 15 minutes
      high: '1h',       // Every hour
      normal: '3h',     // Every 3 hours
      low: '6h',        // Every 6 hours
      lowest: '12h',    // Every 12 hours
      minimal: '1d'     // Daily
    },
    '30d': {
      highest: '1h',    // Every hour
      high: '3h',       // Every 3 hours
      normal: '6h',     // Every 6 hours
      low: '12h',       // Every 12 hours
      lowest: '1d',     // Daily
      minimal: '2d'     // Every 2 days
    }
  } as const;

  // Enforce 30-day limit
  if (daysDiff > 30) {
    daysDiff = 30;
  }

  const timeFrame = 
    daysDiff <= 1 ? '1d' :
    daysDiff <= 7 ? '7d' : '30d';

  return windowSizes[timeFrame][resolution as keyof typeof windowSizes[typeof timeFrame]] || windowSizes[timeFrame].normal;
}

export async function fetchAllSensorData(
  boxId: string,
  sensors: SensorConfig[], 
  timeRange: TimeRange,
  resolution: string = 'normal'
): Promise<SensorDataGroup> {
  const result: SensorDataGroup = {};

  try {
    // Calculate window size based on time range
    const fromDate = new Date(timeRange.fromDate);
    const toDate = new Date(timeRange.toDate);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If resolution is a custom interval (e.g., "5m", "1h", "2d"), use it directly
    const window = /^\d+[mhd]$/.test(resolution) ? resolution : getWindowSize(daysDiff, resolution as WindowResolution);

    console.log('Fetching data with window:', { daysDiff, window, resolution, fromDate, toDate });

    // Fetch data for each sensor sequentially to avoid rate limiting
    for (const sensor of sensors) {
      try {
        const url = new URL(`https://api.opensensemap.org/boxes/${boxId}/data/${sensor.id}`);
        
        // Format dates as RFC3339 (which is a subset of ISO8601)
        // Example: 2024-03-27T17:58:01.384Z
        const fromDateStr = fromDate.toISOString();
        const toDateStr = toDate.toISOString();
        
        url.searchParams.append('from-date', fromDateStr);
        url.searchParams.append('to-date', toDateStr);
        url.searchParams.append('order', 'asc');
        url.searchParams.append('format', 'json');
        url.searchParams.append('download', 'false');

        console.log(`Fetching data for sensor ${sensor.name} (${sensor.id}):`, {
          url: url.toString(),
          fromDate: fromDateStr,
          toDate: toDateStr,
          window
        });

        const response = await fetch(url.toString());
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch data for sensor ${sensor.name} (${sensor.id}):`, {
            status: response.status,
            error: errorText,
            url: url.toString()
          });
          result[sensor.id] = [];
          continue;
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.error(`Invalid data format for sensor ${sensor.name} (${sensor.id}):`, data);
          result[sensor.id] = [];
          continue;
        }

        // Map the data to our format and validate each measurement
        const validData = data
          .filter(measurement => measurement && measurement.value && !isNaN(parseFloat(measurement.value)))
          .map(measurement => ({
            value: measurement.value,
            createdAt: measurement.createdAt,
            location: Array.isArray(measurement.location?.coordinates) 
              ? measurement.location.coordinates 
              : [0, 0],
            sensorId: sensor.id
          }));

        console.log(`Received ${validData.length} measurements for sensor ${sensor.name}:`, {
          timeRange: `${fromDateStr} to ${toDateStr}`,
          daysDiff,
          window,
          measurements: validData.length
        });

        // Verify we have data spanning the entire range
        if (validData.length > 0) {
          const firstDate = new Date(validData[0].createdAt);
          const lastDate = new Date(validData[validData.length - 1].createdAt);
          const actualDaysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`Data range for sensor ${sensor.name}:`, {
            firstDate: firstDate.toISOString(),
            lastDate: lastDate.toISOString(),
            expectedDays: daysDiff,
            actualDays: actualDaysDiff,
            measurements: validData.length
          });
        }

        result[sensor.id] = validData;

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing sensor ${sensor.name} (${sensor.id}):`, error);
        result[sensor.id] = [];
      }
    }

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