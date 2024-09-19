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
