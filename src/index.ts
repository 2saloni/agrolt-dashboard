import 'reflect-metadata';
import express, { Application } from 'express';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.config';
// User routes removed
import authRoutes from './route/auth.route';

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
  }

  public async start() {
    await this.initializeDatabase();
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

const PORT = parseInt(process.env.APP_PORT || '3000', 10);
const app = new App(PORT);
app.start().catch(err => console.error('Error starting server:', err));
