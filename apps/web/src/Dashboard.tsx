import { FormEvent, useId, useState } from 'react';
import { ApolloCache, useMutation, useQuery } from '@apollo/client';
import { logout } from './authSlice';
import { CREATE_CUSTOMER, CUSTOMERS, DELETE_CUSTOMER } from './graphql';
import { useAppDispatch, useAppSelector } from './store';
import type {
  CreateCustomerResult,
  Customer,
  CustomerInput,
  CustomersResult,
  DeleteCustomerResult,
} from './types';

const emptyForm: CustomerInput = {
  name: '',
  email: '',
  company: '',
  phone: '',
  status: 'lead',
};

function appendCustomer(cache: ApolloCache<object>, customer: Customer) {
  cache.updateQuery<CustomersResult>({ query: CUSTOMERS }, (existing) => {
    if (!existing) return existing;
    if (existing.customers.some((item) => item.id === customer.id)) return existing;
    return { customers: [...existing.customers, customer] };
  });
}

function removeCustomer(cache: ApolloCache<object>, id: string) {
  cache.updateQuery<CustomersResult>({ query: CUSTOMERS }, (existing) => {
    if (!existing) return existing;
    return { customers: existing.customers.filter((item) => item.id !== id) };
  });
}

export function Dashboard() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const nameId = useId();
  const emailId = useId();
  const companyId = useId();
  const phoneId = useId();
