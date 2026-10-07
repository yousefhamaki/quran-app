import bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../interfaces/auth.interface';
import { AUTH } from '../constants/auth.constants';

export class BcryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly saltRounds: number = AUTH.DEFAULT_SALT_ROUNDS) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
