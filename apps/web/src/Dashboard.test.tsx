import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppCache } from './apolloCache';
import { Dashboard } from './Dashboard';
import auth from './authSlice';
import { CREATE_CUSTOMER, CUSTOMERS, DELETE_CUSTOMER } from './graphql';

const session = {
  token: 'jwt-token',
  user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'sales' },
};

const existingCustomer = {
  __typename: 'Customer' as const,
  id: 'c1',
  name: 'Acme',
  email: 'hello@acme.com',
  company: 'Acme Co',
  phone: '555',
  status: 'lead',
  createdAt: '2024-01-01',
};

function renderDashboard(mocks: MockedResponse[]) {
  const store = configureStore({
    reducer: { auth },
    preloadedState: { auth: session },
  });

  return render(
    <Provider store={store}>
      <MockedProvider mocks={mocks} cache={createAppCache()}>
        <Dashboard />
      </MockedProvider>
    </Provider>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an empty state when there are no customers', async () => {
    renderDashboard([
      {
        request: { query: CUSTOMERS },
        result: { data: { customers: [] } },
      },
    ]);

    expect(
      await screen.findByText('No customers yet. Add your first customer to get started.'),
    ).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('creates a customer and surfaces success feedback', async () => {
    const created = {
      __typename: 'Customer' as const,
      id: 'c2',
      name: 'Globex',
      email: 'ops@globex.com',
      company: 'Globex',
      phone: '',
      status: 'lead',
      createdAt: '2024-02-01',
    };

    renderDashboard([
      {
        request: { query: CUSTOMERS },
        result: { data: { customers: [] } },
      },
      {
