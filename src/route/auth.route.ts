import { Router } from "express";
import { AuthController } from "../controller/auth.controller";

const router: Router = Router();
const authController: AuthController = new AuthController();

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout)
router.post('/refresh-token', authController.refreshToken);

export default router;
