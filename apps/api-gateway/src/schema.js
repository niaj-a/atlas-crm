import { GraphQLError } from 'graphql';
import { config } from './config.js';
import { serviceRequest } from './client.js';

export const typeDefs = `#graphql
  type User { id: ID!, name: String!, email: String!, role: String! }
  type AuthPayload { token: String!, user: User! }
  input RegisterInput { name: String!, email: String!, password: String! }
  input LoginInput { email: String!, password: String! }

  type Activity { id: ID!, type: String!, text: String!, createdBy: String!, createdAt: String }
  type Customer {
    id: ID!, name: String!, email: String, company: String, phone: String,
    status: String!, createdAt: String, updatedAt: String, activities: [Activity!]!
  }
  input CustomerInput { name: String!, email: String, company: String, phone: String, status: String }
  input CustomerUpdateInput { name: String, email: String, company: String, phone: String, status: String }
  input ActivityInput { type: String!, text: String! }

  type Query { me: User, customers(limit: Int, offset: Int): [Customer!]! }
  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    createCustomer(input: CustomerInput!): Customer!
    updateCustomer(id: ID!, input: CustomerUpdateInput!): Customer!
    deleteCustomer(id: ID!): Boolean!
    addActivity(customerId: ID!, input: ActivityInput!): Customer!
  }
`;

export const resolvers = {
  Query: {
    me: (_root, _args, context) => context.user,
    customers: (_root, { limit, offset }, context) => {
      requireUser(context);
      const search = new URLSearchParams();
      if (limit !== undefined) search.set('limit', String(limit));
      if (offset !== undefined) search.set('offset', String(offset));
      const query = search.size ? `?${search}` : '';
      return serviceRequest(config.crmServiceUrl, `/customers${query}`, { token: context.token });
    },
  },
  Mutation: {
    register: (_root, { input }) =>
      serviceRequest(config.authServiceUrl, '/register', { method: 'POST', body: input }),
    login: (_root, { input }) =>
      serviceRequest(config.authServiceUrl, '/login', { method: 'POST', body: input }),
    createCustomer: (_root, { input }, context) => {
      requireUser(context);
      return serviceRequest(config.crmServiceUrl, '/customers', {
        method: 'POST',
        token: context.token,
        body: input,
      });
    },
    updateCustomer: (_root, { id, input }, context) => {
      requireUser(context);
      return serviceRequest(config.crmServiceUrl, `/customers/${id}`, {
        method: 'PUT',
