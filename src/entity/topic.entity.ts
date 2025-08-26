import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Device } from "./device.entity";
import { Zone } from "./zone.entity";

@Entity('topics')
export class Topic {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ nullable: false, unique: true })
    name!: string;

    @Column({ type: 'json', nullable: true })
    data?: object;

    @OneToMany(() => Device, device => device.topic)
    devices!: Device[];

    @Column({ nullable: true })
    deviceId?: string;

    @OneToMany(() => Zone, zone => zone.topic)
    zones!: Zone[];

    @Column({ nullable: true })
    zoneId?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}