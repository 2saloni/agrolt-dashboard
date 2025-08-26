import { Repository } from "typeorm";
import { User } from "../entity/user.entity";
import { AppDataSource } from "../config/database.config";
import { UserService } from "./user.service";
import { RegisterRequest, LoginRequest, TokenRequest } from "../dto/request/auth.request";
import { AuthResponse, AuthTokens } from "../dto/response/auth.response";
import { AccessTokenPayload, RefreshTokenPayload } from "../interface/jwt.interface";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import { Singleton } from "../decorator/singleton.decorator";

dotenv.config();

@Singleton
export class AuthService {
  private readonly userRepository: Repository<User> = AppDataSource.getRepository(User);
  private readonly userService: UserService;
  
  // Environment variables with default values
  private readonly JWT_ACCESS_SECRET: string = process.env.JWT_ACCESS_SECRET || "access_secret";
  private readonly JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || "refresh_secret";
  private readonly JWT_ACCESS_EXPIRATION: string = process.env.JWT_ACCESS_EXPIRATION || "15m";
  private readonly JWT_REFRESH_EXPIRATION: string = process.env.JWT_REFRESH_EXPIRATION || "7d";
  
  // Store for refresh tokens - in a production app, this should be in a database
  private readonly refreshTokens: Map<string, { userId: string, tokenId: string }> = new Map();

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Register a new user
   * @param registerRequest User registration data
   * @returns Auth response with user and tokens
   */
  public async register(registerRequest: RegisterRequest): Promise<AuthResponse> {
    const { name, email, password } = registerRequest;
    
    // Check if user already exists
    const existingUser: User | null = await this.userRepository.findOne({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error("User with this email already exists");
    }
    
    // Hash password
    const saltRounds: number = 10;
    const hashedPassword: string = await bcrypt.hash(password, saltRounds);
    
    // Create user using UserService
    const user: User = await this.userService.createUser({
      name,
      email,
      password: hashedPassword
    });
    
    // Generate tokens
    const tokens: AuthTokens = this.generateTokens(user);
    
    return {
      user: user,
      tokens
    };
  }

  /**
   * Authenticate a user
   * @param loginRequest Login credentials
   * @returns Auth response with user and tokens
   */
  public async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginRequest;
    
    // Find user
    const user: User | null = await this.userRepository.findOne({
      where: { email }
    });
    
    if (!user) {
      throw new Error("Invalid email or password");
    }
    
    // Compare password
    const isPasswordValid: boolean = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }
    
    // Generate tokens
    const tokens: AuthTokens = this.generateTokens(user);
    
    return {
      user,
      tokens
    };
  }

  /**
   * Logout a user by invalidating their refresh token
   * @param token Refresh token
   * @returns Success flag
   */
  public async logout(token: string): Promise<boolean> {
    try {
      // Verify token
      const payload: RefreshTokenPayload = jwt.verify(
        token, 
        this.JWT_REFRESH_SECRET
      ) as RefreshTokenPayload;
      
      // Remove token from storage
      const tokenKey: string = `${payload.userId}:${payload.tokenId}`;
      this.refreshTokens.delete(tokenKey);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param tokenRequest Refresh token request
   * @returns New tokens
   */
  public async refreshToken(tokenRequest: TokenRequest): Promise<AuthTokens> {
    const { refreshToken } = tokenRequest;
    
    try {
      // Verify refresh token
      const payload: RefreshTokenPayload = jwt.verify(
        refreshToken, 
        this.JWT_REFRESH_SECRET
      ) as RefreshTokenPayload;
      
      // Check if token exists in storage
      const tokenKey: string = `${payload.userId}:${payload.tokenId}`;
      const storedToken = this.refreshTokens.get(tokenKey);
      
      if (!storedToken) {
        throw new Error("Invalid refresh token");
      }
      
      // Get user
      const user: User | null = await this.userRepository.findOne({
        where: { id: payload.userId }
      });
      
      if (!user) {
        throw new Error("User not found");
      }
      
      // Generate new tokens
      return this.generateTokens(user);
      
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  /**
   * Validate access token
   * @param token Access token to validate
   * @returns User ID if valid
   */
  public validateAccessToken(token: string): string {
    try {
      const payload: AccessTokenPayload = jwt.verify(
        token, 
        this.JWT_ACCESS_SECRET
      ) as AccessTokenPayload;
      
      return payload.userId;
    } catch (error) {
      throw new Error("Invalid access token");
    }
  }

  /**
   * Generate JWT tokens for a user
   * @param user User to generate tokens for
   * @returns Access and refresh tokens
   */
  private generateTokens(user: User): AuthTokens {
    // Create a unique token ID
    const tokenId: string = this.generateTokenId();
    
    // Access token payload
    const accessPayload: AccessTokenPayload = {
      userId: user.id,
      email: user.email
    };
    
    // Refresh token payload
    const refreshPayload: RefreshTokenPayload = {
      userId: user.id,
      tokenId
    };
    
    // Generate tokens
    const accessToken: string = jwt.sign(
      accessPayload,
      this.JWT_ACCESS_SECRET,
      { expiresIn: this.JWT_ACCESS_EXPIRATION } as SignOptions
    );
    
    const refreshToken: string = jwt.sign(
      refreshPayload,
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRATION } as SignOptions
    );
    
    // Store refresh token
    const tokenKey: string = `${user.id}:${tokenId}`;
    this.refreshTokens.set(tokenKey, { userId: user.id, tokenId });
    
    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Generate a random token ID
   * @returns Random string
   */
  private generateTokenId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
