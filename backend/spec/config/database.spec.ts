import { Database } from '../../src/config/database';

describe('Database', () => {
  const driver = { connect: jest.fn().mockResolvedValue(undefined), disconnect: jest.fn().mockResolvedValue(undefined) };
  const database = new Database(driver);

  it('connect passes the uri to the driver', async () => {
    await database.connect('mongodb://x/db');
    expect(driver.connect).toHaveBeenCalledWith('mongodb://x/db');
  });

  it('disconnect closes the driver', async () => {
    await database.disconnect();
    expect(driver.disconnect).toHaveBeenCalled();
  });

  it('can be built with the default driver without connecting', () => {
    expect(new Database()).toBeInstanceOf(Database);
  });
});
