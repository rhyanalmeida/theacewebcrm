import mongoose from 'mongoose';
import { logger } from './logger';

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  
  private constructor() {}
  
  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ace_crm';
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
      });
      
      logger.info('Connected to MongoDB successfully');
      
      // Set up connection event listeners
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });
      
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public async dropDatabase(): Promise<void> {
    try {
      await mongoose.connection.dropDatabase();
      logger.info('Database dropped successfully');
    } catch (error) {
      logger.error('Error dropping database:', error);
      throw error;
    }
  }
}

export default DatabaseConfig.getInstance();