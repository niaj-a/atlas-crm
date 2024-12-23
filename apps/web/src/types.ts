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
  createdAt?: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type CustomerInput = {
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  status?: string;
};

export type LoginResult = { login: AuthPayload };
export type RegisterResult = { register: AuthPayload };
export type CustomersResult = { customers: Customer[] };
export type CreateCustomerResult = { createCustomer: Customer };
export type DeleteCustomerResult = { deleteCustomer: boolean };
