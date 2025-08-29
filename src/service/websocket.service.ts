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
  public initialize(server: HttpServer): void {
    try {
      this.io = new SocketIOServer(server, {
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
      console.log(`Client connected: ${socket.id}`);
      
      // Subscribe to specific topics
      socket.on('subscribe', (topicName: string) => {
        console.log(`Client ${socket.id} subscribed to topic: ${topicName}`);
        socket.join(`topic:${topicName}`);
      });
      
      // Unsubscribe from specific topics
      socket.on('unsubscribe', (topicName: string) => {
        console.log(`Client ${socket.id} unsubscribed from topic: ${topicName}`);
        socket.leave(`topic:${topicName}`);
      });
      
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
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
    
    // Broadcast to clients subscribed to this specific topic
    this.io.to(`topic:${topic.name}`).emit('topicUpdate', {
      id: topic.id,
      name: topic.name,
      data: data,
      deviceId: topic.deviceId,
      zoneId: topic.zoneId,
      timestamp: new Date()
    });
    
    // Also broadcast to the "all-topics" room for clients listening to all updates
    this.io.to('all-topics').emit('topicUpdate', {
      id: topic.id,
      name: topic.name,
      data: data,
      deviceId: topic.deviceId,
      zoneId: topic.zoneId,
      timestamp: new Date()
    });
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
