import { Router } from 'express';
import { ProgressModel } from '../models/progress.model';
import { GetProgressService } from '../services/progress/getProgress.service';
import { UpdateProgressService } from '../services/progress/updateProgress.service';
import { GetProgressController } from '../controllers/progress/getProgress.controller';
import { UpdateProgressController } from '../controllers/progress/updateProgress.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { updateProgressSchema } from '../validation/progress/updateProgress.validation';

export class ProgressRoute {
  readonly router = Router();

  constructor(private readonly auth: AuthMiddleware) {
    this.register();
  }

  private register(): void {
    /**
     * @openapi
     * /api/progress:
     *   get:
     *     tags: [Progress]
     *     summary: Get the current user's reading progress (surah and ayah are null if none saved)
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: Reading progress }
     *       401: { description: Not authenticated }
     */
    this.router.get('/', this.auth.authenticate, new GetProgressController(new GetProgressService(ProgressModel)).handle);

    /**
     * @openapi
     * /api/progress:
     *   put:
     *     tags: [Progress]
     *     summary: Save the current user's reading progress (upsert)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [surah, ayah]
     *             properties:
     *               surah: { type: integer, minimum: 1, maximum: 114 }
     *               ayah: { type: integer, minimum: 1 }
     *     responses:
     *       200: { description: Progress saved }
     *       400: { description: Validation failed }
     *       401: { description: Not authenticated }
     */
    this.router.put(
      '/',
      this.auth.authenticate,
      ValidationMiddleware.validate(updateProgressSchema, 'body'),
      new UpdateProgressController(new UpdateProgressService(ProgressModel)).handle
    );
  }
}
