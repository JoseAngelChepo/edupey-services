import { UserRole, AccountTier } from '../../users/schemas/user.schema';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    avatar?: string;
    accountTier: AccountTier;
  };
}

/**
 * Result of registration. Active accounts receive session cookies;
 * inactive accounts remain pending and receive no session.
 */
export interface RegisterResponse {
  user: AuthResponse['user'];
  pending: boolean;
}
