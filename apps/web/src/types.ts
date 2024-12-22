export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AuthPayload = {
  token: string;
  user: User;
};

export type AuthState = {
  token: string | null;
  user: User | null;
};

export type CustomerStatus = 'lead' | 'active' | 'inactive' | string;

export type Customer = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  status: CustomerStatus;
