import { IsDefined, IsOptional, IsString } from "class-validator";

export class createDeviceRequest {
    @IsDefined()
    @IsString()
    deviceNumber: string;

    @IsOptional()
    @IsString()
    name: string;

}