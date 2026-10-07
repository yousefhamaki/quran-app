import { Router } from 'express';
import { GetHealthService } from '../services/health/getHealth.service';
import { GetHealthController } from '../controllers/health/getHealth.controller';

export class HealthRoute {
  readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    /**
     * @openapi
     * /api/health:
     *   get:
     *     tags: [Health]
     *     summary: Liveness probe (public)
     *     responses:
     *       200:
     *         description: The API is up
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: boolean, example: true }
     *                 data:
     *                   type: object
     *                   properties:
     *                     status: { type: string, example: ok }
     *                     timestamp: { type: string, format: date-time }
     */
    this.router.get('/', new GetHealthController(new GetHealthService()).handle);
  }
}
