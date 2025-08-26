export class RegisterRequest {
  name!: string;
  email!: string;
  password!: string;
}

export class LoginRequest {
  email!: string;
  password!: string;
}

export class TokenRequest {
  refreshToken!: string;
}
