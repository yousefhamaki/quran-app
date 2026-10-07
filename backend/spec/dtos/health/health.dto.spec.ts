import { HealthDto } from '../../../src/dtos/health/health.dto';

describe('HealthDto', () => {
  it('serialises the timestamp as an ISO string', () => {
    const dto = new HealthDto('ok', new Date('2026-02-03T04:05:06.000Z'));
    expect(dto).toEqual({ status: 'ok', timestamp: '2026-02-03T04:05:06.000Z' });
  });
});
