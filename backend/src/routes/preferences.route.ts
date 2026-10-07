import { Router } from 'express';
import { PreferencesModel } from '../models/preferences.model';
import { GetPreferencesService } from '../services/preferences/getPreferences.service';
import { UpdatePreferencesService } from '../services/preferences/updatePreferences.service';
import { GetPreferencesController } from '../controllers/preferences/getPreferences.controller';
import { UpdatePreferencesController } from '../controllers/preferences/updatePreferences.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { updatePreferencesSchema } from '../validation/preferences/updatePreferences.validation';

export class PreferencesRoute {
  readonly router = Router();

  constructor(private readonly auth: AuthMiddleware) {
    this.register();
  }

  private register(): void {
    /**
     * @openapi
     * /api/preferences:
     *   get:
     *     tags: [Preferences]
     *     summary: Get the current user's preferences (defaults if none saved)
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: Preferences }
     *       401: { description: Not authenticated }
     */
    this.router.get(
      '/',
      this.auth.authenticate,
      new GetPreferencesController(new GetPreferencesService(PreferencesModel)).handle
    );

    /**
     * @openapi
     * /api/preferences:
     *   put:
     *     tags: [Preferences]
     *     summary: Update the current user's preferences (upsert, partial update allowed)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             minProperties: 1
     *             properties:
     *               lang: { type: string, enum: [ar, en] }
     *               reciter: { type: string }
     *               tafsirId: { type: integer, minimum: 1 }
     *               speed: { type: number, minimum: 0.5, maximum: 2 }
     *               fontSize: { type: number, minimum: 16, maximum: 72 }
     *               showTranslation: { type: boolean }
     *               continuous: { type: boolean }
     *     responses:
     *       200: { description: Preferences saved }
     *       400: { description: Validation failed }
     *       401: { description: Not authenticated }
     */
    this.router.put(
      '/',
      this.auth.authenticate,
      ValidationMiddleware.validate(updatePreferencesSchema, 'body'),
      new UpdatePreferencesController(new UpdatePreferencesService(PreferencesModel)).handle
    );
  }
}
