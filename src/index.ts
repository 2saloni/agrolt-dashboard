import 'reflect-metadata';
import express, { Application } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.config';
// Routes
import authRoutes from './route/auth.route';
import deviceRoutes from './route/device.route';
import zoneRoutes from './route/zone.route';
import topicRoutes from './route/topic.route';
// Services
import { mqttService } from './service/mqtt.service';
import { webSocketService } from './service/websocket.service';

// Load environment variables
dotenv.config();

class App {
  public app: Application;
  public port: number;
  public server: http.Server;

  constructor(port: number) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = port;

    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private async initializeDatabase() {
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  private initializeMiddlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes() {
    // Register API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/devices', deviceRoutes);
    this.app.use('/api/zones', zoneRoutes);
    this.app.use('/api/topics', topicRoutes);
  }

  public async start() {
    await this.initializeDatabase();
    
    // Initialize MQTT service after database is ready
    await mqttService.initialize();
    
    // Start the HTTP server
    this.server.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
      
      // Initialize WebSocket service after HTTP server is running
      webSocketService.initialize(this.server);
      console.log('WebSocket server initialized');
      
      // Log MQTT connection status
      const mqttConnected = mqttService.isConnectedToBroker();
      console.log(`MQTT Broker connection: ${mqttConnected ? 'Connected' : 'Disconnected'}`);
    });
  }
}

const PORT = parseInt(process.env.APP_PORT || '3000', 10);
const app = new App(PORT);
app.start().catch(err => console.error('Error starting server:', err));

// Handle application shutdown
process.on('SIGINT', () => {
  console.log('Application shutting down...');
  mqttService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Application terminated');
  mqttService.disconnect();
  process.exit(0);
});
