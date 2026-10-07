import { Request, Response } from 'express';
import { DeleteBookmarkController } from '../../../src/controllers/bookmarks/deleteBookmark.controller';

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('DeleteBookmarkController', () => {
  const result = { message: 'Bookmark deleted' };

  it('responds 200 with { success, data } from the service', async () => {
    const service = { use: jest.fn().mockResolvedValue(result) };
    const res = mockRes();
    const next = jest.fn();
    const req = { user: { id: 'u1', role: 'user', jti: 'j1' }, params: { id: 'abc' } } as unknown as Request;

    await new DeleteBookmarkController(service as never).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ actor: { id: 'u1', role: 'user', jti: 'j1' }, id: 'abc' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('boom');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();
    const req = { user: { id: 'u1', role: 'user', jti: 'j1' }, params: { id: 'abc' } } as unknown as Request;

    await new DeleteBookmarkController(service as never).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
