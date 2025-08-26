import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entity/user.entity';
import { Device } from '../entity/device.entity';
import { Zone } from '../entity/zone.entity';
import { Topic } from '../entity/topic.entity';

// Load environment variables
dotenv.config();
console.log('db-host', process.env.DB_HOST);
console.log('db-user', process.env.DB_USER);
console.log('db-pass', process.env.DB_PASS);
console.log('db-name', process.env.DB_NAME);

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_USER,
    synchronize: false,    
    logging: true,
    entities: [User, Device, Zone, Topic]
});

export const initializeDatabase = async (): Promise<void> => {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connection initialized successfully');
    } catch (error) {
        console.error('❌ Error during database initialization:', error);
        throw error;
    }
};

export const closeDatabase = async (): Promise<void> => {
    try {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('✅ Database connection closed successfully');
        }
    } catch (error) {
        console.error('❌ Error during database connection close:', error);
        throw error;
    }
};
