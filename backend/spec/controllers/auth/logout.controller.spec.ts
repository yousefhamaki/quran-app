import { Request, Response } from 'express';
import { LogoutController } from '../../../src/controllers/auth/logout.controller';

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('LogoutController', () => {
  const result = { message: 'Logged out' };

  it('responds 200 with { success, data } from the service', async () => {
    const service = { use: jest.fn().mockResolvedValue(result) };
    const res = mockRes();
    const next = jest.fn();
    const req = { user: { id: 'u1', role: 'user', jti: 'j1' } } as unknown as Request;

    await new LogoutController(service as never).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ userId: 'u1', jti: 'j1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('boom');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();
    const req = { user: { id: 'u1', role: 'user', jti: 'j1' } } as unknown as Request;

    await new LogoutController(service as never).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
