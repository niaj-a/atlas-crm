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
  const statusId = useId();

  const { data, loading, error } = useQuery<CustomersResult>(CUSTOMERS);
  const [form, setForm] = useState<CustomerInput>(emptyForm);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [createCustomer, createState] = useMutation<CreateCustomerResult>(CREATE_CUSTOMER, {
    update(cache, { data: mutationData }) {
      const created = mutationData?.createCustomer;
      if (created) appendCustomer(cache, created);
    },
  });

  const [deleteCustomer, deleteState] = useMutation<DeleteCustomerResult>(DELETE_CUSTOMER);

  const customers = data?.customers ?? [];
  const mutationBusy = createState.loading || deleteState.loading;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await createCustomer({ variables: { input: form } });
      if (!result.data?.createCustomer) {
        setActionError('Could not create customer. Please try again.');
        return;
      }
      setForm(emptyForm);
      setActionMessage(`Added ${result.data.createCustomer.name}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create customer.');
    }
  }

  async function onDelete(customer: Customer) {
    const confirmed = window.confirm(`Delete ${customer.name}? This cannot be undone.`);
    if (!confirmed) return;

    setActionError(null);
    setActionMessage(null);
    try {
      const result = await deleteCustomer({
        variables: { id: customer.id },
        optimisticResponse: { deleteCustomer: true },
        update(cache, { data: mutationData }) {
          if (mutationData?.deleteCustomer) removeCustomer(cache, customer.id);
        },
      });
      if (!result.data?.deleteCustomer) {
        setActionError(`Could not delete ${customer.name}.`);
        return;
      }
      setActionMessage(`Deleted ${customer.name}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Could not delete ${customer.name}.`);
    }
  }

  return (
    <div className="shell">
      <header>
        <div>
          <strong>Atlas CRM</strong>
          <span>{user?.email}</span>
        </div>
        <button type="button" className="secondary" onClick={() => dispatch(logout())}>
          Sign out
        </button>
      </header>
      <main className="grid">
        <section className="panel">
          <h2>Add customer</h2>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor={nameId}>Name</label>
              <input
                id={nameId}
                name="name"
                required
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={emailId}>Email</label>
              <input
                id={emailId}
                name="email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={companyId}>Company</label>
              <input
                id={companyId}
                name="company"
                value={form.company ?? ''}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={phoneId}>Phone</label>
              <input
                id={phoneId}
                name="phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={statusId}>Status</label>
              <select
                id={statusId}
                name="status"
                value={form.status ?? 'lead'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button type="submit" disabled={createState.loading} aria-busy={createState.loading}>
              {createState.loading ? 'Adding…' : 'Add customer'}
            </button>
          </form>
        </section>

        <section className="panel wide">
          <h2>Customers</h2>
          <div className="status" role="status" aria-live="polite">
            {loading && <p>Loading…</p>}
            {mutationBusy && !loading && <p className="muted">Updating customers…</p>}
            {actionMessage && <p className="success">{actionMessage}</p>}
          </div>
          <div role="alert" aria-live="assertive">
            {error && <p className="error">{error.message}</p>}
            {actionError && <p className="error">{actionError}</p>}
          </div>
          {!loading && !error && customers.length === 0 && (
            <p className="empty">No customers yet. Add your first customer to get started.</p>
          )}
          <div className="customers">
            {customers.map((customer) => (
              <article key={customer.id}>
                <div>
                  <strong>{customer.name}</strong>
                  <span>
                    {customer.company || 'No company'} · {customer.email || 'No email'}
                  </span>
                </div>
                <div className="actions">
                  <span className={`badge ${customer.status}`}>{customer.status}</span>
                  <button
                    type="button"
                    className="danger"
                    disabled={deleteState.loading}
                    onClick={() => onDelete(customer)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
