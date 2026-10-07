import { UserEntity } from '../../interfaces/user.interface';
import { UserRole } from '../../enums/userRole.enum';

export class UserDto {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly createdAt?: Date;

  constructor(user: UserEntity) {
    this.id = String(user._id);
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
  }
}
