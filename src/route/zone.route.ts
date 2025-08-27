import { Router } from 'express';
import { ZoneController } from '../controller/zone.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();
const zoneController: ZoneController = new ZoneController();

// All routes require authentication
router.use(authMiddleware);

// Zone routes
router.post('/create-zone', (req, res) => zoneController.createZone(req, res));
router.get('/get-zone/:id', (req, res) => zoneController.getZoneById(req, res));
router.get('/get-zones', (req, res) => zoneController.getAllZones(req, res));

export default router;
