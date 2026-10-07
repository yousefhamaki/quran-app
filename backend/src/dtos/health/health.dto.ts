export class HealthDto {
  readonly status: string;
  readonly timestamp: string;

  constructor(status: string, timestamp: Date) {
    this.status = status;
    this.timestamp = timestamp.toISOString();
  }
}
