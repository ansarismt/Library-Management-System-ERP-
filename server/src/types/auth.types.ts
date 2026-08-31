import { Role } from "../constants/roles.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}