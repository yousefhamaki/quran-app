import { Request, Response } from 'express';
import { UpdateProgressController } from '../../../src/controllers/progress/updateProgress.controller';

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('UpdateProgressController', () => {
  const result = { surah: 2, ayah: 5 };

  it('responds 200 with { success, data } from the service', async () => {
    const service = { use: jest.fn().mockResolvedValue(result) };
    const res = mockRes();
    const next = jest.fn();
    const req = { user: { id: 'u1', role: 'user', jti: 'j1' }, body: { surah: 2, ayah: 5 } } as unknown as Request;

    await new UpdateProgressController(service as never).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ actor: { id: 'u1', role: 'user', jti: 'j1' }, body: { surah: 2, ayah: 5 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('boom');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();
    const req = { user: { id: 'u1', role: 'user', jti: 'j1' }, body: { surah: 2, ayah: 5 } } as unknown as Request;

    await new UpdateProgressController(service as never).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
