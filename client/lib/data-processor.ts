import { SensorData } from './sensors';

interface DataWindow {
  startTime: Date;
  endTime: Date;
  data: SensorData[];
  aggregationType: 'raw' | 'hourly' | 'daily' | 'weekly' | string;
}

interface DataCache {
  [key: string]: {
    window: DataWindow;
    timestamp: number;
  };
}

export class DataProcessor {
  private cache: DataCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private lastAggregationType: string | null = null;

  /**
   * Process sensor data with windowing and optional aggregation
   */
  processData(
    data: SensorData[],
    startTime: Date,
    endTime: Date,
    aggregationType: 'raw' | 'hourly' | 'daily' | 'weekly' | string = 'raw'
  ): SensorData[] {
    console.log('[DataProcessor] Processing request:', {
      dataPoints: data.length,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      aggregationType,
      lastAggregationType: this.lastAggregationType
    });

    if (!data || data.length === 0) return [];

    // Clear cache if aggregation type changes
    if (this.lastAggregationType !== null && this.lastAggregationType !== aggregationType) {
      console.log('[DataProcessor] Aggregation type changed, clearing cache:', {
        previous: this.lastAggregationType,
        new: aggregationType,
        cacheSize: Object.keys(this.cache).length
      });
      this.clearCache();
    }
    this.lastAggregationType = aggregationType;

    const sensorId = data[0].sensorId;
    const cacheKey = `${sensorId}_${startTime.toISOString()}_${endTime.toISOString()}_${aggregationType}`;
    
    console.log('[DataProcessor] Checking cache:', {
      sensorId,
      cacheKey,
      cacheSize: Object.keys(this.cache).length,
      hasCacheEntry: !!this.cache[cacheKey]
    });

    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      console.log('[DataProcessor] Using cached data:', {
        sensorId,
        dataLength: cachedData.data.length,
        aggregationType: cachedData.aggregationType,
        sampleData: cachedData.data.slice(0, 2)
      });
      return cachedData.data;
    }

    console.log('[DataProcessor] Cache miss, processing data');
    let processedData = this.filterDataByTimeWindow(data, startTime, endTime);
    console.log('[DataProcessor] Filtered data:', {
      sensorId,
      originalCount: data.length,
      filteredCount: processedData.length
    });
    
    if (aggregationType !== 'raw') {
      if (/^\d+[mhd]$/.test(aggregationType)) {
        // Custom interval aggregation
        const value = parseInt(aggregationType.slice(0, -1));
        const unit = aggregationType.slice(-1) as 'm' | 'h' | 'd';
        console.log('[DataProcessor] Applying custom interval aggregation:', {
          value,
          unit,
          dataPoints: processedData.length
        });
        processedData = this.aggregateDataByInterval(processedData, value, unit);
      } else {
        // Standard aggregation
        console.log('[DataProcessor] Applying standard aggregation:', {
          type: aggregationType,
          dataPoints: processedData.length
        });
        processedData = this.aggregateData(processedData, aggregationType as 'hourly' | 'daily' | 'weekly');
      }
    }

    console.log('[DataProcessor] Storing in cache:', {
      sensorId,
      cacheKey,
      dataPoints: processedData.length,
      sampleData: processedData.slice(0, 2)
    });

    this.cache[cacheKey] = {
      window: {
        startTime,
        endTime,
        data: processedData,
        aggregationType
      },
      timestamp: Date.now()
    };

    return processedData;
  }

  /**
   * Filter data by time window
   */
  private filterDataByTimeWindow(
    data: SensorData[],
    startTime: Date,
    endTime: Date
  ): SensorData[] {
    return data.filter(item => {
      const itemTime = new Date(item.createdAt);
      return itemTime >= startTime && itemTime <= endTime;
    });
  }

  /**
   * Aggregate data based on the specified type
   */
  private aggregateData(
    data: SensorData[],
    aggregationType: 'hourly' | 'daily' | 'weekly'
  ): SensorData[] {
    const aggregatedData: { [key: string]: SensorData } = {};

    data.forEach(item => {
      const date = new Date(item.createdAt);
      let key: string;
      let timestamp: string;

      switch (aggregationType) {
        case 'hourly':
          key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
          timestamp = `${key}:00:00.000Z`; // Add minutes, seconds, and milliseconds
          break;
        case 'daily':
          key = date.toISOString().slice(0, 10); // YYYY-MM-DD
          timestamp = `${key}T12:00:00.000Z`; // Use noon for daily aggregation
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          timestamp = `${key}T12:00:00.000Z`; // Use noon for weekly aggregation
          break;
      }

      if (!aggregatedData[key]) {
        // Create a new data point with only necessary properties
        aggregatedData[key] = {
          sensorId: item.sensorId,
          location: item.location,
          createdAt: timestamp, // Use the properly formatted ISO timestamp
          value: '0'
        };
        (aggregatedData[key] as any).count = 0;
      }

      const value = parseFloat(item.value);
      const existingValue = parseFloat(aggregatedData[key].value);
      const count = (aggregatedData[key] as any).count + 1;

      aggregatedData[key].value = ((existingValue * (count - 1) + value) / count).toString();
      (aggregatedData[key] as any).count = count;
    });

    return Object.values(aggregatedData);
  }

  /**
   * Aggregate data by custom interval
   */
  private aggregateDataByInterval(
    data: SensorData[],
    value: number,
    unit: 'm' | 'h' | 'd'
  ): SensorData[] {
    console.log('[DataProcessor] Starting interval aggregation:', {
      value,
      unit,
      inputDataPoints: data.length
    });

    const aggregatedData: { [key: string]: SensorData } = {};
    const intervalMs = value * (
      unit === 'm' ? 60 * 1000 : // minutes to ms
      unit === 'h' ? 60 * 60 * 1000 : // hours to ms
      24 * 60 * 60 * 1000 // days to ms
    );

    console.log('[DataProcessor] Calculated interval:', {
      intervalMs,
      intervalInMinutes: intervalMs / (60 * 1000)
    });

    data.forEach(item => {
      const date = new Date(item.createdAt);
      const intervalStart = new Date(Math.floor(date.getTime() / intervalMs) * intervalMs);
      const key = intervalStart.toISOString();

      if (!aggregatedData[key]) {
        aggregatedData[key] = {
          sensorId: item.sensorId,
          location: item.location,
          createdAt: key,
          value: '0'
        };
        (aggregatedData[key] as any).count = 0;
      }

      const value = parseFloat(item.value);
      const existingValue = parseFloat(aggregatedData[key].value);
      const count = (aggregatedData[key] as any).count + 1;

      aggregatedData[key].value = ((existingValue * (count - 1) + value) / count).toString();
      (aggregatedData[key] as any).count = count;
    });

    const result = Object.values(aggregatedData).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    console.log('[DataProcessor] Completed interval aggregation:', {
      inputDataPoints: data.length,
      outputDataPoints: result.length,
      sampleData: result.slice(0, 2)
    });

    return result;
  }

  /**
   * Get data from cache if valid
   */
  private getFromCache(key: string): DataWindow | null {
    const cached = this.cache[key];
    if (!cached) return null;

    const isValid = Date.now() - cached.timestamp < this.CACHE_DURATION;
    if (!isValid) {
      delete this.cache[key];
      return null;
    }

    return cached.window;
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    const cacheSize = Object.keys(this.cache).length;
    console.log('[DataProcessor] Clearing cache:', {
      previousSize: cacheSize,
      cacheKeys: Object.keys(this.cache)
    });
    this.cache = {};
  }
}

export const dataProcessor = new DataProcessor(); 