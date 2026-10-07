import { Request, Response } from 'express';
import { RegisterController } from '../../../src/controllers/auth/register.controller';

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('RegisterController', () => {
  const result = { token: 't' };

  it('responds 201 with { success, data } from the service', async () => {
    const service = { use: jest.fn().mockResolvedValue(result) };
    const res = mockRes();
    const next = jest.fn();
    const req = { body: { name: 'Ali', email: 'a@b.com', password: 'secret123' }, ip: '1.2.3.4', get: jest.fn().mockReturnValue('jest-agent') } as unknown as Request;

    await new RegisterController(service as never).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ body: { name: 'Ali', email: 'a@b.com', password: 'secret123' }, ip: '1.2.3.4', userAgent: 'jest-agent' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('boom');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();
    const req = { body: { name: 'Ali', email: 'a@b.com', password: 'secret123' }, ip: '1.2.3.4', get: jest.fn().mockReturnValue('jest-agent') } as unknown as Request;

    await new RegisterController(service as never).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
