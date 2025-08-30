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
}
