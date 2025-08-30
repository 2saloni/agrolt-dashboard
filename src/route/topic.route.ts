import express, { Router } from 'express';
import { TopicController } from '../controller/topic.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = express.Router();
const topicController = new TopicController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all topics
router.get('/fetch-topics', topicController.getAllTopics);

// Get specific topic by ID
router.get('/fetch-topic/:id', topicController.getTopicById);

export default router;
