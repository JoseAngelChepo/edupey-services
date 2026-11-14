export type CreateUserDto = {
  email: string;
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  authProvider?: 'local' | 'google';
  avatar?: string;
  googleId?: string;
  isEmailVerified?: boolean;
  /** Defaults to `true` for the hackathon; an explicit `false` remains supported. */
  isActive?: boolean;
};
