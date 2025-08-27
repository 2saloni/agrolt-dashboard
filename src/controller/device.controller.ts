import { Request, Response } from 'express';
import { DeviceService } from '../service/device.service';
import { createDeviceRequest } from '../dto/request/device.request';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ApiResponse } from '../dto/response/api.response';
import { Device } from '../entity/device.entity';

export class DeviceController {
    private deviceService: DeviceService;

    constructor() {
        this.deviceService = new DeviceService();
    }

    /**
     * Create a new device
     * @param req Request
     * @param res Response
     */
    async createDevice(req: Request, res: Response): Promise<void> {
        try {
            // Validate request body
            const deviceRequest: createDeviceRequest = plainToInstance(createDeviceRequest, req.body);
            const errors: ValidationError[] = await validate(deviceRequest);
            
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
            
            // Create device
            const device: Device = await this.deviceService.createDevice(deviceRequest, userId);
            
            res.status(201).json(ApiResponse.success(device, 'Device created successfully'));
        } catch (error: any) {
            const errorMessage: string = error.message || 'Unknown error';
            res.status(500).json(ApiResponse.error('Failed to create device', errorMessage));
        }
    }

    /**
     * Get a device by ID
     * @param req Request
     * @param res Response
     */
    async getDevice(req: Request, res: Response): Promise<void> {
        try {
            const deviceId: string = req.params.id;
            const userId: string | undefined = req.userId;
            
            if (!userId) {
                res.status(401).json(ApiResponse.error('Authentication required', 'User not authenticated'));
                return;
            }
            
            const device: Device = await this.deviceService.getDeviceById(deviceId, userId);
            
            res.status(200).json(ApiResponse.success(device, 'Device fetched successfully'));
        } catch (error: any) {
            const errorMessage: string = error.message || 'Unknown error';
            const statusCode: number = errorMessage.includes('not found') ? 404 : 
                                      errorMessage.includes('Access denied') ? 403 : 500;
            
            res.status(statusCode).json(ApiResponse.error('Failed to fetch device', errorMessage));
        }
    }

    /**
     * Get all devices for the authenticated user
     * @param req Request
     * @param res Response
     */
    async getAllDevices(req: Request, res: Response): Promise<void> {
        try {
            const userId: string | undefined = req.userId;
            
            if (!userId) {
                res.status(401).json(ApiResponse.error('Authentication required', 'User not authenticated'));
                return;
            }
            
            const devices: Device[] = await this.deviceService.getAllDevices(userId);
            
            res.status(200).json(ApiResponse.success(devices, 'Devices fetched successfully'));
        } catch (error: any) {
            const errorMessage: string = error.message || 'Unknown error';
            res.status(500).json(ApiResponse.error('Failed to fetch devices', errorMessage));
        }
    }
}
