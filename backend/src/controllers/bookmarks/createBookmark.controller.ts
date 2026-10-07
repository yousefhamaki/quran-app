import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { CreateBookmarkServiceInput } from '../../interfaces/bookmark.interface';
import { CreateBookmarkRequestDto } from '../../dtos/bookmarks/createBookmarkRequest.dto';
import { BookmarkDto } from '../../dtos/bookmarks/bookmark.dto';

export class CreateBookmarkController {
  constructor(private readonly service: IService<CreateBookmarkServiceInput, BookmarkDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ actor: req.user!, body: req.body as CreateBookmarkRequestDto });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
