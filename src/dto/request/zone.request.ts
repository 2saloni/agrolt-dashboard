import { IsDefined, IsString } from "class-validator";

export class createZoneRequest {
    @IsDefined()
    @IsString()
    name: string;

    @IsDefined()
    @IsString()
    deviceId: string;
}