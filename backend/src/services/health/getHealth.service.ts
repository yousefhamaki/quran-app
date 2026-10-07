import { IService } from '../../interfaces/service.interface';
import { Clock } from '../../interfaces/health.interface';
import { HealthDto } from '../../dtos/health/health.dto';

export class GetHealthService implements IService<void, HealthDto> {
  constructor(private readonly clock: Clock = () => new Date()) {}

  async use(): Promise<HealthDto> {
    return new HealthDto('ok', this.clock());
  }
}
