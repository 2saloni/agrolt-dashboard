/**
 * Interfaces for IoT zone data processing
 */

/**
 * Configuration for data field pattern matching
 */
export interface ZoneConfig {
  decimalFields: RegExp[];
  binaryFields: RegExp[];
  asIsFields: RegExp[];
}

/**
 * Structure for zone field data (nested in ZoneData)
 */
export interface ZoneFieldData {
  [key: string]: number[] | any;
}

/**
 * Structure for zone data received from MQTT
 */
export interface ZoneData {
  d: ZoneFieldData;
  ts: string;
}

/**
 * Processed field data with converted values
 */
export interface ProcessedZoneFieldData {
  [key: string]: string[] | number[] | any;
}

/**
 * Processed zone data with conversions applied
 */
export interface ProcessedZoneData {
  d: ProcessedZoneFieldData;
  ts: string;
}
