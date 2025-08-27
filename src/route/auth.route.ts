import { Router } from "express";
import { AuthController } from "../controller/auth.controller";

const router: Router = Router();
const authController: AuthController = new AuthController();

// Auth routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

export default router;
