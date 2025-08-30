/**
 * Utility functions for data conversion in IoT dashboard
 */
import { 
  ZoneConfig, 
  ZoneData, 
  ProcessedZoneData 
} from '../interface/zone-data.interface';

// Define common field patterns for all zones
const ZONE_CONFIG: ZoneConfig = {
  decimalFields: [/^d2\d\d$/, /^d4\d\d$/, /^d5\d\d$/], // Matches d2xx, d4xx, d5xx fields (e.g., d200, d230, d410, d470, d500, etc.)
  binaryFields: [/^x\d+$/, /^y\d+$/],                  // Matches all x and y fields (e.g., x0, x20, y0, y20, etc.)
  asIsFields: [/^m55\d$/]                              // Matches m55x fields (e.g., m550, m551, m552, etc.)
};

/**
 * Convert a number by placing decimal point before last digit and ensuring one decimal place
 * e.g., 345 -> 34.5, 611 -> 61.1, 400 -> 40.0, 0 -> 0
 * @param value The number to convert
 * @returns The converted number with decimal point (as fixed-point string with 1 decimal place)
 */
export const convertDecimalPlace = (value: number): string => {
  if (value === 0) return "0";
  // Divide by 10 and ensure the result has exactly one decimal place
  return (value / 10).toFixed(1);
};

/**
 * Convert a number to 8-bit signed binary
 * @param value The number to convert
 * @returns The 8-bit signed binary representation as a string
 */
export const convertTo8BitSignedBinary = (value: number): string => {
  // Ensure the value is within 8-bit signed range (-128 to 127)
  const clampedValue = Math.max(-128, Math.min(127, value));
  
  // Convert to 8-bit binary representation
  // For negative numbers, this will use two's complement
  const binary = (clampedValue & 0xFF).toString(2).padStart(8, '0');
  
  return binary;
};

/**
 * Determines which zone the data belongs to based on its structure
 * @param topic The MQTT topic name
 * @param data The data object
 * @returns Number indicating zone (1, 2, 3) or 0 if not detected
 */
export const detectZoneType = (topic: string, data: ZoneData | null | undefined): number => {
  if (!data || !data.d) {
    return 0;
  }

  // Check if topic contains zone identifier
  if (topic.includes('zone1')) {
    return 1;
  } else if (topic.includes('zone2')) {
    return 2;
  } else if (topic.includes('zone3')) {
    return 3;
  }
  
  // If topic doesn't help, try to detect from data structure
  const fields = Object.keys(data.d);
  
  // Zone-specific fields detection
  if (fields.some(field => field === 'd200' || field === 'd230' || field === 'd410' || field === 'd470')) {
    return 1;
  } else if (fields.some(field => field === 'd210' || field === 'd240' || field === 'd430' || field === 'd500')) {
    return 2;
  } else if (fields.some(field => field === 'd220' || field === 'd250' || field === 'd450' || field === 'd530')) {
    return 3;
  }
  
  return 0;
};



/**
 * Process and convert zone data according to specified rules
 * @param data The raw zone data object
 * @returns Processed zone data with conversions applied
 */
export const convertZoneData = (data: ZoneData): ProcessedZoneData => {
  if (!data || !data.d) {
    // If data is somehow invalid, return a minimal valid structure
    return { d: {}, ts: data?.ts || new Date().toISOString() };
  }

  // Create a deep copy to avoid modifying the original data
  const result = JSON.parse(JSON.stringify(data)) as ProcessedZoneData;
  
  // Process "d" object if it exists
  if (result.d) {
    // Process each field based on its type
    for (const fieldName of Object.keys(result.d)) {
      if (!Array.isArray(result.d[fieldName])) {
        continue; // Skip non-array fields
      }
      
      // Check if field needs decimal conversion
      const needsDecimalConversion = ZONE_CONFIG.decimalFields.some(pattern => 
        pattern.test(fieldName)
      );
      
      // Check if field needs binary conversion
      const needsBinaryConversion = ZONE_CONFIG.binaryFields.some(pattern => 
        pattern.test(fieldName)
      );
      
      // Apply appropriate conversion
      if (needsDecimalConversion) {
        result.d[fieldName] = (result.d[fieldName] as number[]).map(convertDecimalPlace);
      } else if (needsBinaryConversion) {
        result.d[fieldName] = (result.d[fieldName] as number[]).map(convertTo8BitSignedBinary);
      }
      // Fields not matching any pattern are kept as is
    }
  }
  
  // Timestamp (ts) is kept as is
  return result;
};

/**
 * Process data for websocket broadcasting
 * Detects zone type and applies appropriate conversions
 * @param topic The MQTT topic
 * @param data The data to process
 * @returns Processed data ready for websocket
 */
export const processDataForWebsocket = (topic: string, data: ZoneData | Record<string, any>): ProcessedZoneData | Record<string, any> => {
  // Check if this belongs to any of our known zones
  const zoneType = detectZoneType(topic, data as ZoneData);
  
  if (zoneType > 0 && 'd' in data && 'ts' in data) {
    // Apply conversions for zone data
    return convertZoneData(data as ZoneData);
  }
  
  // For other data types, return as is
  return data;
};
