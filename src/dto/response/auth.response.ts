import { User } from "../../entity/user.entity";

export class AuthTokens {
  accessToken!: string;
  refreshToken!: string;
}

export class AuthResponse {
  user: User;
  tokens!: AuthTokens;
}
