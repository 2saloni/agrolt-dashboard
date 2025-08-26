import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Device } from "./device.entity";
import { Topic } from "./topic.entity";

@Entity('zones')
export class Zone {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ nullable: false })
    name!: string;
    
    @ManyToOne(() => Device, device => device.zones)
    @JoinColumn({ name: 'deviceId' })
    device!: Device;
    
    @Column({ nullable: false })
    deviceId!: string;
    
    @ManyToOne(() => Topic, topic => topic.zones)
    @JoinColumn({ name: 'topicId' })
    topic!: Topic;
    
    @Column({ nullable: true })
    topicId?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}
