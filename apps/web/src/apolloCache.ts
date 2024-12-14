import { InMemoryCache } from '@apollo/client';

export function createAppCache() {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          customers: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  });
}
