import { Router } from 'express';
import { DeviceController } from '../controller/device.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const deviceController = new DeviceController();

// All routes require authentication
router.use(authMiddleware);

// Create a new device
router.post('/create-device', (req, res) => deviceController.createDevice(req, res));

// Get a device by ID
router.get('/get-device/:id', (req, res) => deviceController.getDevice(req, res));

// Get all devices
router.get('/get-devices', (req, res) => deviceController.getAllDevices(req, res));

export default router;
