import { Repository } from "typeorm";
import { User } from "../entity/user.entity";
import { AppDataSource } from "../config/database.config";
import { CreateUserRequest } from "../dto/request/user.request";


export class UserService {

    private readonly userRepository: Repository<User> = AppDataSource.getRepository(User);

    constructor() {}

    /**
     * Creates a new user
     * @param createUserDto User creation data
     * @returns Newly created user
     */
    public async createUser(createUserRequest: CreateUserRequest): Promise<User> {
        const user: User = this.userRepository.create(createUserRequest);
        return await this.userRepository.save(user);
    }

    /**
     * Fetches a user by ID
     * @param id User ID
     * @returns User if found, null otherwise
     */
    public async getUserById(id: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { id },
            relations: ['devices']
        });
    }

    /**
     * Fetches all users
     * @returns Array of users
     */
    public async getAllUsers(): Promise<User[]> {
        return await this.userRepository.find({
            relations: ['devices']
        });
    }
}