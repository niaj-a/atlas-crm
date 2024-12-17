import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ApolloClient, ApolloProvider, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { createAppCache } from './apolloCache';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { store } from './store';

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = store.getState().auth.token;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
