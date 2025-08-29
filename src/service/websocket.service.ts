import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Singleton } from '../decorator/singleton.decorator';
import { Topic } from '../entity/topic.entity';

@Singleton
export class WebSocketService {
  private io: SocketIOServer | null = null;
  
  /**
   * Initialize the WebSocket service
   * @param server HTTP server instance
   */
   public async initialize(server: HttpServer): Promise<void> {
    try {
      this.io =  await new SocketIOServer(server, {
        cors: {
          origin: '*', // In production, you should restrict this to your frontend domain
          methods: ['GET', 'POST'],
          credentials: true
        }
      });
      
      console.log('WebSocket server initialized');
      
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to initialize WebSocket service:', error);
    }
  }
  
  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;
    
    this.io.on('connection', (socket) => {
      
      // Subscribe to specific topics
      socket.on('subscribe', (topicName: string) => {
        socket.join(`topic:${topicName}`);
      });
      
      // Unsubscribe from specific topics
      socket.on('unsubscribe', (topicName: string) => {
        socket.leave(`topic:${topicName}`);
      });

      // Handle zone room joining (for multiple users in same zone)
      socket.on('join-room', (data: { roomName: string, deviceName: string }) => {
        const { roomName, deviceName } = data;
        
        // Join the zone room (like 00009zone1)
        socket.join(roomName);
        
        // Also join topic room for MQTT data
        socket.join(`topic:${roomName}`);
        
        // Get current room member count
        const roomSize = this.io?.sockets.adapter.rooms.get(roomName)?.size || 0;
        
        // Emit confirmation back to client
        socket.emit('room-joined', { 
          roomName, 
          deviceName, 
          success: true,
          message: `Successfully joined zone room: ${roomName}`,
          clientCount: roomSize,
          timestamp: new Date().toISOString()
        });
      });

      // Handle zone room leaving
      socket.on('leave-room', (data: { roomName: string, deviceName: string }) => {
        const { roomName, deviceName } = data;
        
        // Leave the zone room
        socket.leave(roomName);
        
        // Leave topic room
        socket.leave(`topic:${roomName}`);
        
        // Get remaining room member count
        const roomSize = this.io?.sockets.adapter.rooms.get(roomName)?.size || 0;
        
        // Emit confirmation back to client
        socket.emit('room-left', { 
          roomName, 
          deviceName, 
          success: true,
          message: `Successfully left zone room: ${roomName}`,
          clientCount: roomSize,
          timestamp: new Date().toISOString()
        });
        
      });

      // Handle custom events from frontend
      socket.onAny((eventName: string, data: any) => {
        // Check if it's a custom zone event (format: {deviceName}{zoneName}-{eventType})
        if (eventName.includes('-') && !['subscribe', 'unsubscribe', 'join-room', 'leave-room'].includes(eventName)) {
          
          // Extract room name from event (everything before the first dash)
          const roomName = eventName.split('-')[0];
          const eventType = eventName.split('-').slice(1).join('-');
          
          // Get room size for logging
          const roomSize = this.io?.sockets.adapter.rooms.get(roomName)?.size || 0;
          
          // Broadcast to all clients in that zone room
          this.io?.to(roomName).emit(eventName, {
            ...data,
            from: socket.id,
            timestamp: new Date(),
            broadcasted: true,
            roomName,
            eventType
          });
        }
      });
      
      socket.on('disconnect', () => {
      });
    });
  }
  
  /**
   * Broadcast topic update to all connected clients subscribed to this topic
   * @param topic The topic that was updated
   * @param data The new data
   */
  public broadcastTopicUpdate(topic: Topic, data: object): void {
    if (!this.io) {
      console.warn('WebSocket server not initialized, cannot broadcast update');
      return;
    }
    
    const topicData = {
      id: topic.id,
      name: topic.name,
      data: data,
      deviceId: topic.deviceId,
      zoneId: topic.zoneId,
      timestamp: new Date()
    };
    
    // Broadcast to clients subscribed to this specific topic (legacy support)
    this.io.to(`topic:${topic.name}`).emit('topicUpdate', topicData);
    
    // NEW: Broadcast to zone room (for multiple users in same zone)
    // This allows multiple users to receive data for zone room like "00009zone1"
    this.io.to(topic.name).emit('zoneData', topicData);
    
        // Also broadcast to the "all-topics" room for clients listening to all updates
    this.io.to('all-topics').emit('topicUpdate', topicData);
  }

  /**
   * Broadcast data specifically to a zone room (multiple users can be in same zone)
   * @param zoneName The zone name (like 00009zone1)
   * @param eventName The event name to emit
   * @param data The data to broadcast
   */
  public broadcastToZoneRoom(zoneName: string, eventName: string, data: object): void {
    if (!this.io) {
      console.warn('WebSocket server not initialized, cannot broadcast to zone room');
      return;
    }
    
    const clientCount = this.io.sockets.adapter.rooms.get(zoneName)?.size || 0;
    
    if (clientCount > 0) {
      this.io.to(zoneName).emit(eventName, {
        ...data,
        zoneName,
        timestamp: new Date(),
        clientCount
      });

    }
  }

  /**
   * Get the number of clients in a specific zone room
   * @param zoneName The zone name
   * @returns Number of connected clients
   */
  public getZoneRoomClientCount(zoneName: string): number {
    if (!this.io) return 0;
    return this.io.sockets.adapter.rooms.get(zoneName)?.size || 0;
  }
  
  /**
   * Check if WebSocket server is initialized
   */
  public isInitialized(): boolean {
    return this.io !== null;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
