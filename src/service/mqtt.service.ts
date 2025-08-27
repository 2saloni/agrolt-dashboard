import * as mqtt from 'mqtt';
import { Singleton } from '../decorator/singleton.decorator';
import { Device } from '../entity/device.entity';
import { Topic } from '../entity/topic.entity';
import { Zone } from '../entity/zone.entity';
import { AppDataSource } from '../config/database.config';

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

      // Create topics for all existing devices and zones before connecting
      await this.createTopicsForExistingDevicesAndZones();

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
  
  /**
   * Creates topics for all existing devices and zones in the database
   */
  private async createTopicsForExistingDevicesAndZones(): Promise<void> {
    try {
      console.log('Creating topics for all existing devices and zones...');
      
      // Get the device repository
      const deviceRepository = AppDataSource.getRepository(Device);
      
      // Get all devices with their zones
      const devices = await deviceRepository.find({ 
        relations: ['zones'] 
      });
      
      console.log(`Found ${devices.length} devices in database`);
      
      // For each device-zone pair, create a topic
      let topicsCreated = 0;
      
      for (const device of devices) {
        if (device.zones && device.zones.length > 0) {
          for (const zone of device.zones) {
            // Build the topic name
            const topicName = this.buildTopic(device.deviceNumber, zone.name);
            
            // Store the topic in the database and get the topic name
            await this.storeTopicSubscription(topicName, device.id, zone.id);
            topicsCreated++;
          }
        }
      }
      
      console.log(`Created ${topicsCreated} topics for existing devices and zones`);
    } catch (error) {
      console.error('Failed to create topics for existing devices and zones:', error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.isConnected = true;
      this.subscribeToStoredTopics();
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
   * Handles message received on a subscribed topic
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const topicInfo = this.topicSubscriptions.get(topic);
      if (!topicInfo) {
        console.warn(`Received message on topic ${topic}, but no subscription info found`);
        return;
      }

      const data = this.parseMessage(message);
      await this.storeTopicData(topic, data, topicInfo.deviceId, topicInfo.zoneId);
    } catch (error) {
      console.error(`Failed to handle message on topic ${topic}:`, error);
    }
  }

  /**
   * Parses the message from buffer to object
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
   * Stores the received topic data in the database
   */
  private async storeTopicData(
    topicName: string, 
    data: object, 
    deviceId?: string, 
    zoneId?: string
  ): Promise<void> {
    try {
      const topicRepository = AppDataSource.getRepository(Topic);
      
      // Find existing topic or create new
      let topic = await topicRepository.findOne({ where: { name: topicName } });
      
      if (!topic) {
        topic = new Topic();
        topic.name = topicName;
        topic.deviceId = deviceId;
        topic.zoneId = zoneId;
      }
      
      // Update the data field with the new message
      topic.data = data;
      
      await topicRepository.save(topic);
      console.log(`Updated topic ${topicName} with new data`);
    } catch (error) {
      console.error(`Failed to store topic data for ${topicName}:`, error);
    }
  }

  /**
   * Builds a topic string using device and zone information
   * Format: deviceNumberzoneName (e.g., 00009zone1)
   */
  public buildTopic(deviceNumber: string, zoneName: string): string {
    // Sanitize inputs to ensure valid MQTT topic
    const sanitizedDeviceNumber = deviceNumber.replace(/[#+]/g, '_');
    const sanitizedZoneName = zoneName.replace(/[#+]/g, '_');
    
    // Directly concatenate device number and zone name as per example: 00009zone1
    return `${sanitizedDeviceNumber}${sanitizedZoneName}`;
  }

  /**
   * Subscribes to a topic and stores the subscription
   * Flow: First store to DB, then subscribe, then handle incoming data
   */
  public async subscribeTopic(
    deviceId?: string, 
    zoneId?: string
  ): Promise<string | null> {
    if (!AppDataSource.isInitialized) {
      console.error('Database not initialized, cannot store topic');
      return null;
    }

    try {
      // Get device and zone information to build topic
      let deviceNumber: string = '';
      let zoneName: string = '';
      
      if (deviceId) {
        const deviceRepository = AppDataSource.getRepository(Device);
        const device = await deviceRepository.findOne({ where: { id: deviceId } });
        if (device) {
          deviceNumber = device.deviceNumber;
        }
      }
      
      if (zoneId) {
        const zoneRepository = AppDataSource.getRepository(Zone);
        const zone = await zoneRepository.findOne({ where: { id: zoneId } });
        if (zone) {
          zoneName = zone.name;
        }
      }
      
      if (!deviceNumber || !zoneName) {
        console.warn('Missing device number or zone name, cannot build topic');
        return null;
      }
      
      // Build topic name
      const topicName = this.buildTopic(deviceNumber, zoneName);
      
      // STEP 1: First store the topic in the database
      const storedTopic = await this.storeTopicSubscription(topicName, deviceId, zoneId);
      if (!storedTopic) {
        console.error('Failed to store topic in database');
        return null;
      }
      
      // STEP 2: Then subscribe to the topic
      if (!this.isConnected || !this.client) {
        console.warn('MQTT client not connected, topic saved but cannot subscribe');
        return topicName; // Return name since we stored it successfully
      }
      
      return new Promise<string | null>((resolve) => {
        this.client!.subscribe(topicName, (err) => {
          if (err) {
            console.error(`Failed to subscribe to topic ${topicName}:`, err);
            resolve(null);
          } else {
            console.log(`Successfully subscribed to topic: ${topicName}`);
            this.topicSubscriptions.set(topicName, { deviceId, zoneId });
            resolve(topicName);
          }
        });
      });
      
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      return null;
    }
  }

  /**
   * Store topic subscription in the database
   * @returns The stored Topic entity or null if failed
   */
  private async storeTopicSubscription(
    topicName: string, 
    deviceId?: string, 
    zoneId?: string
  ): Promise<Topic | null> {
    try {
      const topicRepository = AppDataSource.getRepository(Topic);
      
      // Check if topic already exists
      let topic = await topicRepository.findOne({ where: { name: topicName } });
      
      if (!topic) {
        // Create new topic
        topic = new Topic();
        topic.name = topicName;
        topic.deviceId = deviceId;
        topic.zoneId = zoneId;
        topic.data = {}; // Initialize with empty object
        
        const savedTopic = await topicRepository.save(topic);
        console.log(`Created new topic in database: ${topicName}`);
        return savedTopic;
      } else {
        console.log(`Topic ${topicName} already exists in database`);
        return topic;
      }
    } catch (error) {
      console.error(`Failed to store topic subscription for ${topicName}:`, error);
      return null;
    }
  }

  /**
   * Load and subscribe to all existing topics from database
   */
  private async subscribeToStoredTopics(): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('MQTT client not connected, cannot subscribe to stored topics');
      return;
    }
    
    if (!AppDataSource.isInitialized) {
      console.warn('Database not initialized, cannot load stored topics');
      return;
    }
    
    try {
      const topicRepository = AppDataSource.getRepository(Topic);
      const topics = await topicRepository.find();
      
      console.log(`Found ${topics.length} topics in database, subscribing...`);
      
      // Subscribe to each topic from the database
      const subscriptionPromises = topics.map(topic => {
        return new Promise<void>((resolve) => {
          if (!this.client) {
            resolve();
            return;
          }
          
          this.client.subscribe(topic.name, (err) => {
            if (err) {
              console.error(`Failed to subscribe to stored topic ${topic.name}:`, err);
            } else {
              console.log(`Successfully subscribed to stored topic: ${topic.name}`);
              this.topicSubscriptions.set(topic.name, { 
                deviceId: topic.deviceId, 
                zoneId: topic.zoneId 
              });
            }
            resolve();
          });
        });
      });
      
      await Promise.all(subscriptionPromises);
      console.log(`Subscribed to ${topics.length} stored topics`);
    } catch (error) {
      console.error('Failed to subscribe to stored topics:', error);
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
