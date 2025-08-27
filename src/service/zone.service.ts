import { FindOneOptions, FindManyOptions, Repository } from "typeorm";
import { Singleton } from "../decorator/singleton.decorator";
import { Zone } from "../entity/zone.entity";
import { AppDataSource } from "../config/database.config";
import { createZoneRequest } from "../dto/request/zone.request";

@Singleton
export class ZoneService {
    private readonly zoneRepository: Repository<Zone>;

    constructor() {
        this.zoneRepository = AppDataSource.getRepository(Zone);
    }

    /**
     * Create a new zone
     * @param zoneData The zone data to create
     * @returns The created zone
     */
    public async createZone(zoneData: createZoneRequest): Promise<Zone> {
        const zone: Zone = new Zone();
        zone.name = zoneData.name;
        zone.deviceId = zoneData.deviceId;

        return await this.zoneRepository.save(zone);
    }

    /**
     * Get a zone by its ID
     * @param id The zone ID
     * @returns The zone if found, null otherwise
     */
    public async getZoneById(id: string): Promise<Zone | null> {
        const options: FindOneOptions<Zone> = {
            where: { id },
            relations: ['device', 'topic']
        };
        return await this.zoneRepository.findOne(options);
    }

    /**
     * Get all zones
     * @returns Array of all zones
     */
    public async getAllZones(): Promise<Zone[]> {
        const options: FindManyOptions<Zone> = {
            relations: ['device', 'topic']
        };
        return await this.zoneRepository.find(options);
    }
}