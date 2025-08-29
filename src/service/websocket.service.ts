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
      // console.log(`🔌 [CONNECTION] New client connected: ${socket.id}`);
      // console.log(`👥 [SERVER INFO] Total connected clients: ${this.io?.engine.clientsCount || 0}`);
      
      // Subscribe to specific topics
      socket.on('subscribe', (topicName: string) => {
        // console.log(`Client ${socket.id} subscribed to topic: ${topicName}`);
        socket.join(`topic:${topicName}`);
      });
      
      // Unsubscribe from specific topics
      socket.on('unsubscribe', (topicName: string) => {
        // console.log(`Client ${socket.id} unsubscribed from topic: ${topicName}`);
        socket.leave(`topic:${topicName}`);
      });

      // Handle zone room joining (for multiple users in same zone)
      socket.on('join-room', (data: { roomName: string, deviceName: string }) => {
        const { roomName, deviceName } = data;
        // console.log(`🚪 [JOIN ROOM] Client ${socket.id} attempting to join zone room: ${roomName}`);
        
        // Join the zone room (like 00009zone1)
        socket.join(roomName);
        
        // Also join topic room for MQTT data
        socket.join(`topic:${roomName}`);
        
        // Get current room member count
        const roomSize = this.io?.sockets.adapter.rooms.get(roomName)?.size || 0;
        
        // console.log(`👥 [ROOM INFO] Zone room ${roomName} now has ${roomSize} connected clients`);
        
        // Emit confirmation back to client
        socket.emit('room-joined', { 
          roomName, 
          deviceName, 
          success: true,
          message: `Successfully joined zone room: ${roomName}`,
          clientCount: roomSize,
          timestamp: new Date().toISOString()
        });
        
        // console.log(`✅ [JOIN SUCCESS] Client ${socket.id} successfully joined zone room: ${roomName} (${roomSize} total clients)`);
      });

      // Handle zone room leaving
      socket.on('leave-room', (data: { roomName: string, deviceName: string }) => {
        const { roomName, deviceName } = data;
        // console.log(`🚪 [LEAVE ROOM] Client ${socket.id} attempting to leave zone room: ${roomName}`);
        
        // Leave the zone room
        socket.leave(roomName);
        
        // Leave topic room
        socket.leave(`topic:${roomName}`);
        
        // Get remaining room member count
        const roomSize = this.io?.sockets.adapter.rooms.get(roomName)?.size || 0;
        
        // console.log(`👥 [ROOM INFO] Zone room ${roomName} now has ${roomSize} connected clients`);
        
        // Emit confirmation back to client
        socket.emit('room-left', { 
          roomName, 
          deviceName, 
          success: true,
          message: `Successfully left zone room: ${roomName}`,
          clientCount: roomSize,
          timestamp: new Date().toISOString()
        });
        
        // console.log(`✅ [LEAVE SUCCESS] Client ${socket.id} successfully left zone room: ${roomName} (${roomSize} remaining clients)`);
      });

      // Handle custom events from frontend
      socket.onAny((eventName: string, data: any) => {
        // Check if it's a custom zone event (format: {deviceName}{zoneName}-{eventType})
        if (eventName.includes('-') && !['subscribe', 'unsubscribe', 'join-room', 'leave-room'].includes(eventName)) {
          // console.log(`🎯 [CUSTOM EVENT] Received custom event: ${eventName} from client ${socket.id}`);
          // console.log(`📋 [EVENT DATA]`, data);
          
          // Extract room name from event (everything before the first dash)
          const roomName = eventName.split('-')[0];
          const eventType = eventName.split('-').slice(1).join('-');
          
          // console.log(`🎯 [EVENT INFO] Zone: ${roomName}, Event Type: ${eventType}`);
          
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
          
          // console.log(`✅ [CUSTOM EVENT BROADCAST] Broadcasted "${eventName}" to ${roomSize} clients in zone room: ${roomName}`);
        }
      });
      
      socket.on('disconnect', () => {
        // console.log(`🔌 [DISCONNECT] Client disconnected: ${socket.id}`);
        // console.log(`👥 [SERVER INFO] Remaining connected clients: ${(this.io?.engine.clientsCount || 1) - 1}`);
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
    
    // Enhanced logging for zone data broadcasting
    const zoneRoomSize = this.io.sockets.adapter.rooms.get(topic.name)?.size || 0;
    const topicRoomSize = this.io.sockets.adapter.rooms.get(`topic:${topic.name}`)?.size || 0;
    const allTopicsRoomSize = this.io.sockets.adapter.rooms.get('all-topics')?.size || 0;
    
    // console.log(`🔥 [ZONE DATA BROADCAST] Broadcasting data for zone: ${topic.name}`);
    // console.log(`📊 [MQTT DATA] Payload:`, topic.data);
    // console.log(`👥 [BROADCAST INFO] Zone room "${topic.name}": ${zoneRoomSize} clients`);
    // console.log(`👥 [BROADCAST INFO] Topic room "topic:${topic.name}": ${topicRoomSize} clients`);
    // console.log(`👥 [BROADCAST INFO] All-topics room: ${allTopicsRoomSize} clients`);
    // console.log(`✅ [BROADCAST SUCCESS] Data broadcasted to ${zoneRoomSize + topicRoomSize + allTopicsRoomSize} total clients`);
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
      
      // console.log(`Broadcasted ${eventName} to zone room ${zoneName} with ${clientCount} connected clients`);
    } else {
      // console.log(`No clients connected to zone room: ${zoneName}`);
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
