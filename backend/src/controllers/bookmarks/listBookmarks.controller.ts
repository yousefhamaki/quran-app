import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { ListBookmarksServiceInput } from '../../interfaces/bookmark.interface';
import { BookmarkDto } from '../../dtos/bookmarks/bookmark.dto';

export class ListBookmarksController {
  constructor(private readonly service: IService<ListBookmarksServiceInput, BookmarkDto[]>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ actor: req.user! });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
