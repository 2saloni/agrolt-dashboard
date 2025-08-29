import { Request, Response } from "express";
import { AuthService } from "../service/auth.service";
import { RegisterRequest, LoginRequest, TokenRequest } from "../dto/request/auth.request";
import { AuthResponse, AuthTokens } from "../dto/response/auth.response";
import { ApiResponse } from "../dto/response/api.response";

export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    try {
      console.log("Initializing AuthController...");
      this.authService = new AuthService();
      console.log("AuthService initialized successfully:", !!this.authService);
    } catch (error) {
      console.error("Error initializing AuthService:", error);
      throw error;
    }
  }

  /**
   * Register a new user
   * @param req Request with RegisterRequest body
   * @param res Response
   */
  public async register(req: Request, res: Response): Promise<void> {
    try {
      if (!this.authService) {
        console.error("authService is undefined in register method");
        throw new Error("Service not initialized");
      }

      const registerRequest: RegisterRequest = req.body;
      const authResponse: AuthResponse = await this.authService.register(registerRequest);
      
      // Set refresh token in HTTP-only cookie
      this.setRefreshTokenCookie(res, authResponse.tokens.refreshToken);
      
      res.status(201).json(ApiResponse.success({
        user: authResponse.user,
        accessToken: authResponse.tokens.accessToken
      }, "User registered successfully"));
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json(ApiResponse.error(
        "Registration failed", 
        error instanceof Error ? error.message : "Unknown error"
      ));
    }
  }

  /**
   * Login a user
   * @param req Request with LoginRequest body
   * @param res Response
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      if (!this.authService) {
        console.error("authService is undefined in login method");
        throw new Error("Service not initialized");
      }

      const loginRequest: LoginRequest = req.body;
      const authResponse: AuthResponse = await this.authService.login(loginRequest);
      
      // Set refresh token in HTTP-only cookie
      this.setRefreshTokenCookie(res, authResponse.tokens.refreshToken);
      
      res.status(200).json(ApiResponse.success({
        user: authResponse.user,
        accessToken: authResponse.tokens.accessToken,
        refreshToken: authResponse.tokens.refreshToken
      }, "Login successful"));
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json(ApiResponse.error(
        "Authentication failed", 
        error instanceof Error ? error.message : "Unknown error"
      ));
    }
  }

  /**
   * Logout a user
   * @param req Request
   * @param res Response
   */
  public async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken: string = req.cookies.refreshToken || "";
      
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
      
      // Clear refresh token cookie
      res.clearCookie("refreshToken", { 
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
      });
      
      res.status(200).json(ApiResponse.success(null, "Logout successful"));
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json(ApiResponse.error(
        "Logout failed", 
        error instanceof Error ? error.message : "Unknown error"
      ));
    }
  }

  /**
   * Refresh access token
   * @param req Request
   * @param res Response
   */
  public async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken: string = req.body.refreshToken || "";
      
      if (!refreshToken) {
        res.status(401).json(ApiResponse.error("Refresh token required"));
        return;
      }
      
      const tokenRequest: TokenRequest = { refreshToken };
      const tokens: AuthTokens = await this.authService.refreshToken(tokenRequest);
      
      // Set new refresh token in HTTP-only cookie
      this.setRefreshTokenCookie(res, tokens.refreshToken);
      
      res.status(200).json(ApiResponse.success({
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken
      }, "Token refreshed"));
    } catch (error) {
      console.error("Token refresh error:", error);
      
      // Clear invalid refresh token cookie
      res.clearCookie("refreshToken", { 
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
      });
      
      res.status(401).json(ApiResponse.error(
        "Token refresh failed", 
        error instanceof Error ? error.message : "Unknown error"
      ));
    }
  }

  /**
   * Helper method to set refresh token cookie
   * @param res Response object
   * @param refreshToken Refresh token to set
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Prevents JavaScript access
      sameSite: "strict", // CSRF protection
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });
  }
}
