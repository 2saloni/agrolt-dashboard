import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.config';
import { Topic } from '../entity/topic.entity';
import { ApiResponse } from '../dto/response/api.response';

export class TopicController {
  /**
   * Get all topics with their latest data
   * @param req Request
   * @param res Response
   */
  async getAllTopics(req: Request, res: Response): Promise<void> {
    try {
      const topicRepository = AppDataSource.getRepository(Topic);
      const topics = await topicRepository.find({
        where: { isLatest: true }
      });
      
      res.status(200).json(ApiResponse.success(topics, 'Latest topics fetched successfully'));
    } catch (error: any) {
      const errorMessage: string = error.message || 'Unknown error';
      res.status(500).json(ApiResponse.error('Failed to fetch topics', errorMessage));
    }
  }

  /**
   * Get a single topic by ID
   * @param req Request
   * @param res Response
   */
  async getTopicById(req: Request, res: Response): Promise<void> {
    try {
      const topicId: string = req.params.id;
      const topicRepository = AppDataSource.getRepository(Topic);
      
      const topic = await topicRepository.findOne({
        where: { id: topicId }
      });
      
      if (!topic) {
        res.status(404).json(ApiResponse.error('Topic not found', `No topic found with ID ${topicId}`));
        return;
      }
      
      res.status(200).json(ApiResponse.success(topic, 'Topic fetched successfully'));
    } catch (error: any) {
      const errorMessage: string = error.message || 'Unknown error';
      res.status(500).json(ApiResponse.error('Failed to fetch topic', errorMessage));
    }
  }
  

  
  /**
   * Get the latest data for a specific topic
   * @param req Request
   * @param res Response
   */
  async getTopicLatestData(req: Request, res: Response): Promise<void> {
    try {
      const topicId: string = req.params.id;
      const topicRepository = AppDataSource.getRepository(Topic);
      
      const topic = await topicRepository.findOne({
        where: { id: topicId }
      });
      
      if (!topic) {
        res.status(404).json(ApiResponse.error('Topic not found', `No topic found with ID ${topicId}`));
        return;
      }
      
      res.status(200).json(ApiResponse.success({ 
        id: topic.id,
        name: topic.name, 
        data: topic.data,
        updatedAt: topic.updatedAt
      }, 'Topic data fetched successfully'));
    } catch (error: any) {
      const errorMessage: string = error.message || 'Unknown error';
      res.status(500).json(ApiResponse.error('Failed to fetch topic data', errorMessage));
    }
  }

  /**
   * Get historical data for a specific topic
   * @param req Request
   * @param res Response
   */
  async getTopicHistoricalData(req: Request, res: Response): Promise<void> {
    try {
      const topicName: string = req.params.name;
      const limit: number = parseInt(req.query.limit as string) || 100; // Default to last 100 records
      
      const topicRepository = AppDataSource.getRepository(Topic);
      
      // First check if the topic exists
      const latestTopic = await topicRepository.findOne({
        where: { name: topicName, isLatest: true }
      });
      
      if (!latestTopic) {
        res.status(404).json(ApiResponse.error('Topic not found', `No topic found with name ${topicName}`));
        return;
      }
      
      // Get historical data for this topic
      const historyData = await topicRepository.find({
        where: { name: topicName },
        order: { createdAt: 'DESC' },
        take: limit
      });
      
      res.status(200).json(ApiResponse.success({
        topic: {
          id: latestTopic.id,
          name: latestTopic.name
        },
        history: historyData.map(item => ({
          id: item.id,
          data: item.data,
          timestamp: item.createdAt,
          isLatest: item.isLatest
        }))
      }, `Retrieved ${historyData.length} historical data points for topic ${topicName}`));
    } catch (error: any) {
      const errorMessage: string = error.message || 'Unknown error';
      res.status(500).json(ApiResponse.error('Failed to fetch historical topic data', errorMessage));
    }
  }
}
