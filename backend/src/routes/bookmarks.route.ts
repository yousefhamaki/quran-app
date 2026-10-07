import { Router } from 'express';
import { BookmarkModel } from '../models/bookmark.model';
import { ListBookmarksService } from '../services/bookmarks/listBookmarks.service';
import { CreateBookmarkService } from '../services/bookmarks/createBookmark.service';
import { DeleteBookmarkService } from '../services/bookmarks/deleteBookmark.service';
import { ListBookmarksController } from '../controllers/bookmarks/listBookmarks.controller';
import { CreateBookmarkController } from '../controllers/bookmarks/createBookmark.controller';
import { DeleteBookmarkController } from '../controllers/bookmarks/deleteBookmark.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { createBookmarkSchema } from '../validation/bookmarks/createBookmark.validation';
import { deleteBookmarkParamsSchema } from '../validation/bookmarks/deleteBookmark.validation';

export class BookmarksRoute {
  readonly router = Router();

  constructor(private readonly auth: AuthMiddleware) {
    this.register();
  }

  private register(): void {
    /**
     * @openapi
     * /api/bookmarks:
     *   get:
     *     tags: [Bookmarks]
     *     summary: List the current user's bookmarks (newest first)
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: Array of bookmarks }
     *       401: { description: Not authenticated }
     */
    this.router.get('/', this.auth.authenticate, new ListBookmarksController(new ListBookmarksService(BookmarkModel)).handle);

    /**
     * @openapi
     * /api/bookmarks:
     *   post:
     *     tags: [Bookmarks]
     *     summary: Bookmark an ayah
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
     *               note: { type: string, maxLength: 500 }
     *     responses:
     *       201: { description: Bookmark created }
     *       400: { description: Validation failed }
     *       401: { description: Not authenticated }
     *       409: { description: Ayah already bookmarked }
     */
    this.router.post(
      '/',
      this.auth.authenticate,
      ValidationMiddleware.validate(createBookmarkSchema, 'body'),
      new CreateBookmarkController(new CreateBookmarkService(BookmarkModel)).handle
    );

    /**
     * @openapi
     * /api/bookmarks/{id}:
     *   delete:
     *     tags: [Bookmarks]
     *     summary: Delete one of the current user's bookmarks
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string, minLength: 24, maxLength: 24 }
     *     responses:
     *       200: { description: Bookmark deleted }
     *       400: { description: Invalid id }
     *       401: { description: Not authenticated }
     *       404: { description: Bookmark not found }
     */
    this.router.delete(
      '/:id',
      this.auth.authenticate,
      ValidationMiddleware.validate(deleteBookmarkParamsSchema, 'params'),
      new DeleteBookmarkController(new DeleteBookmarkService(BookmarkModel)).handle
    );
  }
}
