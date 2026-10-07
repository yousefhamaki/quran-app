import mongoose from 'mongoose';
import { IDatabaseDriver } from '../interfaces/database.interface';

export class Database {
  constructor(private readonly driver: IDatabaseDriver = mongoose) {}

  async connect(uri: string): Promise<void> {
    await this.driver.connect(uri);
  }

  async disconnect(): Promise<void> {
    await this.driver.disconnect();
  }
}
