import { Repository } from "typeorm";
import { Singleton } from "../decorator/singleton.decorator";
import { AppDataSource } from "../config/database.config";
import { Device } from "../entity/device.entity";
import { createDeviceRequest } from "../dto/request/device.request";
import { User } from "../entity/user.entity";

@Singleton
export class DeviceService {
    private readonly deviceRepository: Repository<Device>;
    private readonly userRepository: Repository<User>;

    constructor() {
        this.deviceRepository = AppDataSource.getRepository(Device);
        this.userRepository = AppDataSource.getRepository(User);
    }

    /**
     * Create a new device
     * @param request Device creation request
     * @param userId Authenticated user ID
     * @returns Created device
     */
    async createDevice(request: createDeviceRequest, userId: string): Promise<Device> {
        try {
            const user: User = await this.userRepository.findOneOrFail({ where: { id: userId } });
            
            // Create new device
            const device: Device = new Device();
            device.deviceNumber = request.deviceNumber;
            device.name = request.name || request.deviceNumber;
            
            // Save the device
            const savedDevice: Device = await this.deviceRepository.save(device);
            
            // Associate device with user
            savedDevice.users = [user];
            await this.deviceRepository.save(savedDevice);
            
            return savedDevice;
        } catch (err: any) {
            const errorMessage: string = err.message || String(err);
            throw new Error(`Failed to create device: ${errorMessage}`);
        }
    }

    /**
     * Fetch a single device by ID
     * @param deviceId Device ID
     * @param userId Authenticated user ID
     * @returns Device
     */
    async getDeviceById(deviceId: string, userId: string): Promise<Device> {
        try {
            // Find device and check if user has access
            const device: Device | null = await this.deviceRepository.findOne({
                where: { id: deviceId },
                relations: ['users', 'zones']
            });

            if (!device) {
                throw new Error('Device not found');
            }

            // Check if user has access to this device
            const hasAccess: boolean = device.users.some((user: User) => user.id === userId);
            if (!hasAccess) {
                throw new Error('Access denied to this device');
            }

            return device;
        } catch (err: any) {
            const errorMessage: string = err.message || String(err);
            throw new Error(`Failed to fetch device: ${errorMessage}`);
        }
    }

    /**
     * Fetch all devices for a user
     * @param userId Authenticated user ID
     * @returns Array of devices
     */
    async getAllDevices(userId: string): Promise<Device[]> {
        try {
            // Find all devices for the user
            const user: User | null = await this.userRepository.findOne({
                where: { id: userId },
                relations: ['devices', 'devices.zones']
            });

            if (!user) {
                throw new Error('User not found');
            }

            const devices: Device[] = user.devices;
            return devices;
        } catch (err: any) {
            const errorMessage: string = err.message || String(err);
            throw new Error(`Failed to fetch devices: ${errorMessage}`);
        }
    }
}