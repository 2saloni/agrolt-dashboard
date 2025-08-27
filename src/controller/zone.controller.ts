import { Request, Response } from 'express';
import { ZoneService } from '../service/zone.service';
import { createZoneRequest } from '../dto/request/zone.request';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ApiResponse } from '../dto/response/api.response';
import { Zone } from '../entity/zone.entity';
import { Singleton } from '../decorator/singleton.decorator';

@Singleton
export class ZoneController {
    private zoneService: ZoneService;

    constructor() {
        this.zoneService = new ZoneService();
    }

    /**
     * Create a new zone
     * @param req Request
     * @param res Response
     */
    async createZone(req: Request, res: Response): Promise<void> {
        try {
            // Validate request body
            const zoneRequest: createZoneRequest = plainToInstance(createZoneRequest, req.body);
            const errors: ValidationError[] = await validate(zoneRequest);
            
            if (errors.length > 0) {
                res.status(400).json(ApiResponse.error('Validation failed', JSON.stringify(errors)));
                return;
            }

            // Get user ID from authenticated request
            const userId: string | undefined = req.userId;
            
            if (!userId) {
                res.status(401).json(ApiResponse.error('Authentication required', 'User not authenticated'));
                return;
            }
            
            // Create zone
            const zone: Zone = await this.zoneService.createZone(zoneRequest);
            
            res.status(201).json(ApiResponse.success(zone, 'Zone created successfully'));
        } catch (error: any) {
            const errorMessage: string = error.message || 'Unknown error';
            res.status(500).json(ApiResponse.error('Failed to create zone', errorMessage));
        }
    }

    /**
     * Get a zone by ID
     * @param req Request
     * @param res Response
     */
    async getZoneById(req: Request, res: Response): Promise<void> {
        try {
            const zoneId: string = req.params.id;

            // Get user ID from authenticated request
            const userId: string | undefined = req.userId;
            
            if (!userId) {
                res.status(401).json(ApiResponse.error('Authentication required', 'User not authenticated'));
                return;
            }

            // Get zone by ID
            const zone: Zone | null = await this.zoneService.getZoneById(zoneId);
            
            if (!zone) {
                res.status(404).json(ApiResponse.error('Zone not found', `No zone found with ID: ${zoneId}`));
                return;
            }

            res.status(200).json(ApiResponse.success(zone, 'Zone retrieved successfully'));
        } catch (error: any) {
            const errorMessage: string = error.message || 'Unknown error';
            res.status(500).json(ApiResponse.error('Failed to retrieve zone', errorMessage));
        }
    }

    /**
     * Get all zones
     * @param req Request
     * @param res Response
     */
    async getAllZones(req: Request, res: Response): Promise<void> {
        try {
            // Get user ID from authenticated request
            const userId: string | undefined = req.userId;
            
            if (!userId) {
                res.status(401).json(ApiResponse.error('Authentication required', 'User not authenticated'));
                return;
            }

            // Get all zones
            const zones: Zone[] = await this.zoneService.getAllZones();
            
            res.status(200).json(ApiResponse.success(zones, 'Zones retrieved successfully'));
        } catch (error: any) {
            const errorMessage: string = error.message || 'Unknown error';
            res.status(500).json(ApiResponse.error('Failed to retrieve zones', errorMessage));
        }
    }
}
