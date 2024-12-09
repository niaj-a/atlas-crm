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
        request: {
          query: CREATE_CUSTOMER,
          variables: {
            input: {
              name: 'Globex',
              email: 'ops@globex.com',
              company: 'Globex',
              phone: '',
              status: 'lead',
            },
          },
        },
        result: { data: { createCustomer: created } },
      },
    ]);

    await screen.findByText('No customers yet. Add your first customer to get started.');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Globex' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ops@globex.com' } });
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Globex' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add customer' }));

    await waitFor(() => {
      expect(screen.getByText('Added Globex.')).toBeInTheDocument();
    });
    expect(screen.getByText('Globex')).toBeInTheDocument();
    expect(
      screen.queryByText('No customers yet. Add your first customer to get started.'),
    ).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting and reports success', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderDashboard([
      {
        request: { query: CUSTOMERS },
        result: { data: { customers: [existingCustomer] } },
      },
      {
        request: {
          query: DELETE_CUSTOMER,
          variables: { id: 'c1' },
        },
        result: { data: { deleteCustomer: true } },
      },
    ]);

    const row = await screen.findByText('Acme');
    const article = row.closest('article');
    expect(article).toBeTruthy();
    fireEvent.click(within(article as HTMLElement).getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Deleted Acme.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
  });

  it('does not delete when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderDashboard([
      {
        request: { query: CUSTOMERS },
        result: { data: { customers: [existingCustomer] } },
      },
    ]);

    const row = await screen.findByText('Acme');
    const article = row.closest('article');
    fireEvent.click(within(article as HTMLElement).getByRole('button', { name: 'Delete' }));

    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});
