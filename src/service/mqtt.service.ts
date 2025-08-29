import * as mqtt from 'mqtt';
import { Singleton } from '../decorator/singleton.decorator';
import { Device } from '../entity/device.entity';
import { Topic } from '../entity/topic.entity';
import { Zone } from '../entity/zone.entity';
import { AppDataSource } from '../config/database.config';
import { webSocketService } from './websocket.service';

@Singleton
export class MqttService {
  private client: mqtt.MqttClient | null = null;
  private brokerUrl: string = process.env.MQTT_BROKER_URL!;
  private isConnected: boolean = false;
  private topicSubscriptions: Map<string, { deviceId?: string, zoneId?: string }> = new Map();

  constructor() {
    // We'll initialize after the database is ready
    // The initialize method will be called externally
  }

  /**
   * Initialize MQTT service - should be called after database is ready
   */
  public async initialize(): Promise<void> {
    try {
      // Check if database is connected
      if (!AppDataSource.isInitialized) {
        console.warn('Database not initialized, waiting before connecting to MQTT');
        return;
      }

      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `mqtt_data_service_${Math.random().toString(16).slice(2, 8)}`,
        username: process.env.MQTT_USERNAME!,
        password: process.env.MQTT_PASSWORD!,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to initialize MQTT client:', error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.isConnected = true;
      this.initializeSubscriptions();
    });

    this.client.on('reconnect', () => {
      console.log('Reconnecting to MQTT broker...');
    });

    this.client.on('error', (error: Error) => {
      console.error('MQTT connection error:', error);
      this.isConnected = false;
    });

    this.client.on('message', async (topic: string, message: Buffer) => {
      console.log(`Received message on topic: ${topic}`);
      await this.handleMessage(topic, message);
    });

    this.client.on('close', () => {
      console.log('MQTT connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Processes and stores messages received on subscribed topics
   * Creates topic entries in the database if they don't exist
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const topicInfo = this.topicSubscriptions.get(topic);
      if (!topicInfo) {
        console.warn(`Received message on topic ${topic}, but no subscription info found`);
        return;
      }

      const data = this.parseMessage(message);
      // We'll store both topic and data in storeTopicData now
      await this.storeTopicData(topic, data, topicInfo.deviceId, topicInfo.zoneId);
    } catch (error) {
      console.error(`Failed to handle message on topic ${topic}:`, error);
    }
  }

  /**
   * Converts buffer message to JSON object
   * Falls back to raw string if JSON parsing fails
   */
  private parseMessage(message: Buffer): object {
    try {
      const messageStr: string = message.toString();
      return JSON.parse(messageStr);
    } catch (error) {
      console.warn('Failed to parse message as JSON, returning raw string');
      return { rawData: message.toString() };
    }
  }

  /**
   * Stores the received topic data in the database and broadcasts via WebSocket
   * Now it also creates the topic entry if it doesn't exist yet
   */
  private async storeTopicData(
    topicName: string, 
    data: object, 
    deviceId?: string, 
    zoneId?: string
  ): Promise<void> {
    try {
      const topicRepository = AppDataSource.getRepository(Topic);
      
      // First, mark all previous entries for this topic as not latest
      await topicRepository
        .createQueryBuilder()
        .update(Topic)
        .set({ isLatest: false })
        .where("name = :name AND isLatest = :isLatest", { name: topicName, isLatest: true })
        .execute();
      
      // Create new topic entry
      const newTopic = new Topic();
      newTopic.name = topicName;
      newTopic.deviceId = deviceId;
      newTopic.zoneId = zoneId;
      newTopic.data = data;
      newTopic.isLatest = true;
      
      // Save to database - this handles both creating the first entry and adding new data entries
      const savedTopic = await topicRepository.save(newTopic);
      console.log(`Added new data entry for topic ${topicName}`);
      
      // Broadcast the update via WebSocket
      if (webSocketService.isInitialized()) {
        webSocketService.broadcastTopicUpdate(savedTopic, data);
      }
    } catch (error) {
      console.error(`Failed to store topic data for ${topicName}:`, error);
    }
  }

  /**
   * Creates MQTT topic string from device number and zone name
   * Format: deviceNumberzoneName (e.g., 00009zone1)
   * Sanitizes inputs to ensure valid MQTT topic format
   */
  public buildTopic(deviceNumber: string, zoneName: string): string {
    // Sanitize inputs to ensure valid MQTT topic
    const sanitizedDeviceNumber = deviceNumber.replace(/[#+]/g, '_');
    const sanitizedZoneName = zoneName.replace(/[#+]/g, '_');
    
    // Directly concatenate device number and zone name as per example: 00009zone1
    return `${sanitizedDeviceNumber}${sanitizedZoneName}`;
  }

  /**
   * Initializes all MQTT subscriptions when client connects
   * Finds all device-zone pairs and subscribes to their topics
   */
  private async initializeSubscriptions(): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('MQTT client not connected, cannot subscribe to topics');
      return;
    }
    
    console.log('MQTT client connected, setting up subscriptions');
    
    // Find all device-zone pairs and subscribe to them
    await this.subscribeToAllDeviceZonePairs();
  }
  
  /**
   * Finds all device-zone pairs in the database and subscribes to their topics
   */
  private async subscribeToAllDeviceZonePairs(): Promise<void> {
    if (!AppDataSource.isInitialized || !this.client) {
      console.error('Database not initialized or client not connected, cannot subscribe to topics');
      return;
    }
    
    try {
      console.log('Finding device-zone pairs to subscribe...');
      
      // Get all devices with their zones
      const devices = await AppDataSource.getRepository(Device).find({ 
        relations: ['zones'] 
      });
      
      console.log(`Found ${devices.length} devices in database`);
      
      // Track subscription stats
      let subscriptionCount = 0;
      const subscriptionPromises: Promise<void>[] = [];
      
      // Process all device-zone pairs
      for (const device of devices) {
        if (!device.zones?.length) continue;
        
        for (const zone of device.zones) {
          const topicName = this.buildTopic(device.deviceNumber, zone.name);
          subscriptionCount++;
          
          // Create a promise for each subscription
          const subscriptionPromise = new Promise<void>((resolve) => {
            this.client!.subscribe(topicName, (err) => {
              if (err) {
                console.error(`Failed to subscribe to topic ${topicName}:`, err);
              } else {
                console.log(`Subscribed to topic: ${topicName}`);
                this.topicSubscriptions.set(topicName, { 
                  deviceId: device.id, 
                  zoneId: zone.id 
                });
              }
              resolve();
            });
          });
          
          subscriptionPromises.push(subscriptionPromise);
        }
      }
      
      // Wait for all subscriptions to complete
      await Promise.all(subscriptionPromises);
      console.log(`Subscribed to ${subscriptionCount} topics from device-zone pairs`);
    } catch (error) {
      console.error('Failed to subscribe to device-zone pairs:', error);
    }
  }
  
  /**
   * Get MQTT connection status
   */
  public isConnectedToBroker(): boolean {
    return this.isConnected;
  }
  
  /**
   * Disconnect MQTT client
   */
  public disconnect(): void {
    if (this.client) {
      this.client.end();
      console.log('MQTT client disconnected');
    }
  }
}

// Export singleton instance
export const mqttService = new MqttService();
