import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { DeleteBookmarkServiceInput } from '../../interfaces/bookmark.interface';
import { MessageDto } from '../../dtos/common/message.dto';

export class DeleteBookmarkController {
  constructor(private readonly service: IService<DeleteBookmarkServiceInput, MessageDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ actor: req.user!, id: String(req.params.id) });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
