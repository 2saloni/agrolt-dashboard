import 'reflect-metadata';
import express, { Application } from 'express';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.config';
// Routes
import authRoutes from './route/auth.route';
import deviceRoutes from './route/device.route';
import zoneRoutes from './route/zone.route';
// MQTT Service
import { mqttService } from './service/mqtt.service';

// Load environment variables
dotenv.config();

class App {
  public app: Application;
  public port: number;

  constructor(port: number) {
    this.app = express();
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
  }

  public async start() {
    await this.initializeDatabase();
    
    // Initialize MQTT service after database is ready
    await mqttService.initialize();
    
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
      
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
