import { GetHealthService } from '../../../src/services/health/getHealth.service';
import { HealthDto } from '../../../src/dtos/health/health.dto';

describe('GetHealthService', () => {
  it('returns an ok status stamped with the injected clock', async () => {
    const service = new GetHealthService(() => new Date('2026-01-01T00:00:00.000Z'));

    const result = await service.use();

    expect(result).toBeInstanceOf(HealthDto);
    expect(result).toEqual({ status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' });
  });

  it('uses the real clock by default', async () => {
    const result = await new GetHealthService().use();
    expect(result.status).toBe('ok');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
