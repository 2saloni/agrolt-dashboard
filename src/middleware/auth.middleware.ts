import { Request, Response, NextFunction } from "express";
import { AuthService } from "../service/auth.service";
import { ApiResponse } from "../dto/response/api.response";
import { Singleton } from "../decorator/singleton.decorator";

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

@Singleton
export class AuthMiddleware {
  private readonly authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Authenticate JWT access token
   * @param req Request
   * @param res Response
   * @param next Next function
   */
  public authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      // Get token from Authorization header
      const authHeader: string | undefined = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json(ApiResponse.error("Authorization token required"));
        return;
      }
      
      // Extract token
      const token: string = authHeader.split(' ')[1];
      
      // Validate token
      const userId: string = this.authService.validateAccessToken(token);
      
      // Attach user ID to request
      req.userId = userId;
      
      next();
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(401).json(ApiResponse.error(
        "Authentication failed",
        error instanceof Error ? error.message : "Invalid token"
      ));
    }
  }
}

// Export a singleton instance
// export const authMiddleware = new AuthMiddleware();
