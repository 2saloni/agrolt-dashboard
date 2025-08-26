import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { Zone } from "./zone.entity";
import { Topic } from "./topic.entity";

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({nullable: true})
    deviceNumber!: string;

    @Column({ nullable: false })
    name!: string;

    @ManyToMany(() => User, user => user.devices)
    @JoinTable()
    users!: User[];
    
    @OneToMany(() => Zone, zone => zone.device)
    zones!: Zone[];
    
    @ManyToOne(() => Topic, topic => topic.devices)
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
