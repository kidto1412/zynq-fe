export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  plan: 'FREE' | 'PRO_LIFETIME';
  licenseKey?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
