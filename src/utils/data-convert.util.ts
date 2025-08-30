/**
 * Utility functions for data conversion in IoT dashboard
 */

// Define field patterns for zone1 data
const ZONE1_CONFIG = {
  decimalFields: [/^d2\d\d$/, /^d4\d\d$/], // Matches d200, d230, d410, d470, etc.
  binaryFields: [/^x\d+$/, /^y\d+$/],      // Matches x0, y0, y20, etc.
  asIsFields: [/^m55\d$/]                  // Matches m550, m551, m552, etc.
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
 * Check if data is from Zone1 based on its structure
 * @param topic The MQTT topic name
 * @param data The data object
 * @returns Boolean indicating if this is Zone1 data
 */
export const isZone1Data = (topic: string, data: any): boolean => {
  if (!data || typeof data !== 'object' || !data.d || typeof data.d !== 'object') {
    return false;
  }

  // Check if topic contains zone identifier
  if (topic.includes('zone1')) {
    return true;
  }
  
  // If topic doesn't help, try to detect from data structure
  const fields = Object.keys(data.d);
  
  // Zone1 specific fields detection
  if (fields.some(field => field === 'd200' || field === 'd230' || field === 'd410' || field === 'd470')) {
    return true;
  }
  
  return false;
};

/**
 * Process and convert Zone1 data according to specified rules
 * @param data The raw zone1 data object
 * @returns Processed zone1 data with conversions applied
 */
export const convertZone1Data = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Create a deep copy to avoid modifying the original data
  const result = JSON.parse(JSON.stringify(data));
  
  // Process "d" object if it exists
  if (result.d && typeof result.d === 'object') {
    // Process each field based on its type
    for (const fieldName of Object.keys(result.d)) {
      if (!Array.isArray(result.d[fieldName])) {
        continue; // Skip non-array fields
      }
      
      // Check if field needs decimal conversion
      const needsDecimalConversion = ZONE1_CONFIG.decimalFields.some(pattern => 
        pattern.test(fieldName)
      );
      
      // Check if field needs binary conversion
      const needsBinaryConversion = ZONE1_CONFIG.binaryFields.some(pattern => 
        pattern.test(fieldName)
      );
      
      // Apply appropriate conversion
      if (needsDecimalConversion) {
        result.d[fieldName] = result.d[fieldName].map(convertDecimalPlace);
      } else if (needsBinaryConversion) {
        result.d[fieldName] = result.d[fieldName].map(convertTo8BitSignedBinary);
      }
      // Fields not matching any pattern are kept as is
    }
  }
  
  // Timestamp (ts) is kept as is
  return result;
};

/**
 * Process data for websocket broadcasting
 * Checks if it's Zone1 data and applies conversions
 * @param topic The MQTT topic
 * @param data The data to process
 * @returns Processed data ready for websocket
 */
export const processDataForWebsocket = (topic: string, data: any): any => {
  // Check if this is Zone1 data
  if (isZone1Data(topic, data)) {
    return convertZone1Data(data);
  }
  
  // For other data types, return as is
  return data;
};
