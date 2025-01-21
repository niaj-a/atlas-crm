# Atlas Production CRM

Atlas is a CRM monorepo (npm workspaces) with a React frontend, a GraphQL API gateway, and separate auth and CRM services backed by MongoDB. It also includes Docker, tests, GitHub Actions, and Terraform for AWS.

What works today:

- Register / login (bcrypt + JWT)
- Per-user customer isolation
- Create, list, and delete customers in the UI
- Update customers and add activities via the API
- Statuses: `lead`, `active`, `inactive`
- Activity types: `note`, `call`, `email`, `meeting`
- Local run with npm or Docker Compose
- Lint, format, test, build, audit, and infra checks in CI
- Deploy to AWS ECS Fargate

> Longer write-up (design choices, data model, security notes, limitations):
> [docs/PROJECT_RESEARCH.md](docs/PROJECT_RESEARCH.md).

## Table of contents

1. [System overview](#system-overview)
2. [Technology stack](#technology-stack)
3. [Repository structure](#repository-structure)
4. [Architecture](#architecture)
5. [Business logic](#business-logic)
6. [Application components](#application-components)
7. [Data model](#data-model)
8. [API surface](#api-surface)
9. [Security model](#security-model)
10. [Local development](#local-development)
11. [Configuration](#configuration)
12. [Testing and quality](#testing-and-quality)
13. [Docker architecture](#docker-architecture)
14. [AWS deployment](#aws-deployment)
15. [Known limitations](#known-limitations)

## System overview

Request path:

1. Browser loads the React SPA.
2. Apollo Client talks GraphQL to the API gateway.
3. Gateway checks auth, then calls internal REST services.
4. Auth service owns users, password hashes, and JWT issuance.
5. CRM service owns customers and embedded activities.
6. MongoDB holds auth and CRM data in separate databases.

The browser never hits MongoDB or the internal services directly. In Docker/AWS, only the web app and gateway should be public.

## Technology stack

| Area            | Technology                           | Purpose                                 |
| --------------- | ------------------------------------ | --------------------------------------- |
| Monorepo        | npm workspaces                       | Apps + shared packages                  |
| Frontend        | React 18 + TypeScript                | UI                                      |
| Build tool      | Vite 5                               | Dev server and frontend build           |
| Client state    | Redux Toolkit                        | Auth session                            |
| Server state    | Apollo Client                        | GraphQL + cache                         |
| Public API      | GraphQL + Apollo Server              | Browser-facing API                      |
| Gateway runtime | Express 4                            | HTTP + middleware                       |
| Internal APIs   | Express REST                         | Gateway ↔ services                      |
| Authentication  | JWT HS256 + bcryptjs                 | Identity and password hashing           |
| Validation      | express-validator                    | Input checks at service boundaries      |
| Persistence     | MongoDB 7 + Mongoose 8               | Users, customers, activities            |
| Shared domain   | `@crm/shared`                        | Statuses, roles, activity types, limits |
| Tests           | Vitest, Supertest, Testing Library   | Unit, HTTP, component tests             |
| Code quality    | ESLint + Prettier                    | Lint and format                         |
| Containers      | Docker + Docker Compose              | Local and production images             |
| Cloud           | AWS ECS Fargate, ALB, ECR, Cloud Map | Runtime and routing                     |
| Operations      | CloudWatch + Secrets Manager         | Logs, alarms, secrets                   |
| Infrastructure  | Terraform                            | AWS provisioning                        |
| CI/CD           | GitHub Actions + AWS OIDC            | Checks and deploy                       |

## Repository structure

```text
production-crm/
├── apps/
│   ├── web/                 React, Redux, Apollo
│   ├── api-gateway/         Public GraphQL API
│   ├── auth-service/        Register, login, JWT
│   └── crm-service/         Customers and activities
├── packages/
│   └── shared/              Shared domain constants
├── docs/
│   ├── API.md               Internal API notes
│   ├── AWS_DEPLOYMENT.md    AWS setup / deploy
│   └── PROJECT_RESEARCH.md  Longer project notes
├── infra/
│   └── terraform/           ECS, ALB, ECR, etc.
├── .github/
│   ├── workflows/ci.yml
│   ├── workflows/deploy-aws.yml
│   └── dependabot.yml
├── docker-compose.yml
├── package.json
└── README.md
```

## Architecture

### Logical architecture

```mermaid
flowchart LR
    User[SalesUser]
    Web["ReactWeb - Redux and Apollo"]
    Gateway["GraphQLGateway - Express and ApolloServer"]
    Auth["AuthService - Express"]
    CRM["CRMService - Express"]
    AuthDB[("MongoDB crm-auth")]
    CRMDB[("MongoDB crm-data")]

    User -->|"register, login, manage customers"| Web
    Web -->|"GraphQL over HTTP"| Gateway
    Gateway -->|"REST: register and login"| Auth
    Gateway -->|"REST: customers and activities"| CRM
    Auth -->|"Mongoose"| AuthDB
    CRM -->|"Mongoose"| CRMDB
```

### Why GraphQL and REST

The browser gets one GraphQL API. The gateway is a BFF: it hides service URLs and the internal REST shape. Auth and CRM stay as small REST services so they can be built, tested, and deployed on their own.

### Who owns what

- Redux: `user` + `token`
- `localStorage` key `crm.session`: session persistence (shape-checked on boot; the client does not re-verify the JWT)
- Apollo: customer queries and cache updates after mutations
- Auth service: user records
- CRM service: customers and activities
- Gateway: no database

## Business logic

### End-to-end flow

```mermaid
flowchart TD
    Start[OpenApplication]
    Session{StructurallyValidSavedSession}
    AuthScreen[ShowLoginOrRegistration]
    Credentials[SubmitCredentials]
    AuthMutation[GraphQLLoginOrRegister]
    AuthService[ValidateAndAuthenticate]
    Token[IssueEightHourJWT]
    Dashboard[ShowCustomerDashboard]
    Action{SelectedAction}
    List[ListOwnedCustomers]
    Create[ValidateAndCreateCustomer]
    Delete[ConfirmAndDeleteCustomer]
    Update[UpdateCustomerViaAPI]
    Activity[AddCustomerActivityViaAPI]
    OwnerScope["Apply ownerId from JWT subject"]
    Refresh[UpdateApolloCacheOrResult]
    Logout[ClearLocalSession]

    Start --> Session
    Session -->|No| AuthScreen
    Session -->|Yes| Dashboard
    AuthScreen --> Credentials --> AuthMutation --> AuthService
    AuthService -->|Invalid| AuthScreen
    AuthService -->|Valid| Token --> Dashboard
    Dashboard --> Action
    Action -->|List| List --> OwnerScope
    Action -->|Create| Create --> OwnerScope
    Action -->|Delete| Delete --> OwnerScope
    Action -->|Update| Update --> OwnerScope
    Action -->|Activity| Activity --> OwnerScope
    OwnerScope --> Refresh --> Dashboard
    Action -->|SignOut| Logout --> AuthScreen
```

### Registration

1. User submits name, email, password.
2. Client sends the `register` mutation.
3. Gateway forwards to `POST /register`.
4. Auth service validates fields and normalizes email.
5. Rejects duplicate emails.
6. Hashes password with bcrypt (cost 12).
7. Stores user with default `sales` role.
8. Signs an HS256 JWT (8h expiry).
9. Client validates the response and stores the session.

### Login

1. User submits email + password.
2. Auth service looks up the normalized email.
3. bcrypt compares against the stored hash.
4. Bad credentials get the same generic error (less account enumeration).
5. Good credentials get a new JWT and public user object.

### Customer management

CRM routes need a bearer token. The CRM service verifies the JWT again even though the gateway already did. Every DB query scopes with `ownerId: req.user.sub`, so users only see their own customers.

On write, only these fields are accepted:

- `name`
- `email`
- `company`
- `phone`
- `status`

IDs, ownership fields, and activity arrays from the client are ignored (mass-assignment / ownership transfer protection).

### Activities

Activities live embedded on the customer document: type, text, creator ID, timestamps. Cap is 200 per customer. GraphQL can add activities; the UI does not expose that yet.

## Application components

### Web application

Location: `apps/web`

- `src/main.tsx` — Redux + Apollo providers, attaches JWT to requests
- `src/App.tsx` — auth screen vs dashboard
- `src/AuthScreen.tsx` — login / register
- `src/Dashboard.tsx` — list, create, delete customers
- `src/authSlice.ts` — session validate + persist
- `src/apolloCache.ts` — Apollo cache config
- `src/ErrorBoundary.tsx` — catches render failures
- `src/types.ts` — frontend / GraphQL types

UI basics: labels, live regions for status/errors, focus styles, loading state, empty state, delete confirm.

### API gateway

Location: `apps/api-gateway`

- `/graphql` and `GET /health` (browser uses GraphQL over HTTP POST)
- Helmet, CORS, JSON body limits
- Verifies HS256 tokens and builds GraphQL context
- Turns bad/missing auth into GraphQL errors
- Calls upstreams with a 5s default timeout
- Maps REST errors to GraphQL codes
- Graceful shutdown on `SIGTERM` / `SIGINT`

### Authentication service

Location: `apps/auth-service`

- `POST /register`, `POST /login`, `GET /health`
- Validates input; never returns password hashes
- Generic invalid-credential responses
- In-memory rate limiting on auth attempts
- Rejects weak/default JWT secrets when `NODE_ENV=production`
- Graceful HTTP + Mongo shutdown

### CRM service

Location: `apps/crm-service`

- Protected customer / activity REST endpoints
- Verifies JWTs itself
- Ownership filters on every query
- Validates bodies and pagination
- Writable-field allowlist
- List `limit` capped at 100; `offset` at 10,000
- Max 200 activities per customer
- Normalizes `_id` and timestamps for clients

### Shared package

Location: `packages/shared`

`@crm/shared` keeps constants in sync:

- Customer statuses
- User roles
- Activity types
- Max activity count

## Data model

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role
        date createdAt
        date updatedAt
    }

    CUSTOMER {
        ObjectId _id PK
        string ownerId
        string name
        string email
        string company
        string phone
        string status
        date createdAt
        date updatedAt
    }

    ACTIVITY {
        ObjectId _id PK
        string type
        string text
        string createdBy
        date createdAt
        date updatedAt
    }

    USER ||--o{ CUSTOMER : owns
    CUSTOMER ||--o{ ACTIVITY : embeds
    USER ||--o{ ACTIVITY : creates
```

Auth and CRM use separate MongoDB databases. `ownerId` / `createdBy` are strings from the JWT subject — not cross-DB Mongoose refs.

## API surface

### Public GraphQL operations

| Type     | Operation                        | Authentication | Purpose                   |
| -------- | -------------------------------- | -------------- | ------------------------- |
| Query    | `me`                             | Optional       | Gateway auth context      |
| Query    | `customers(limit, offset)`       | Required       | List the user's customers |
| Mutation | `register(input)`                | No             | Create user + session     |
| Mutation | `login(input)`                   | No             | Authenticate              |
| Mutation | `createCustomer(input)`          | Required       | Create owned customer     |
| Mutation | `updateCustomer(id, input)`      | Required       | Update owned customer     |
| Mutation | `deleteCustomer(id)`             | Required       | Delete owned customer     |
| Mutation | `addActivity(customerId, input)` | Required       | Add activity              |

### Internal REST endpoints

| Service      | Method and path                  | Purpose              |
| ------------ | -------------------------------- | -------------------- |
| auth-service | `GET /health`                    | Health               |
| auth-service | `POST /register`                 | Register             |
| auth-service | `POST /login`                    | Login                |
| crm-service  | `GET /health`                    | Health               |
| crm-service  | `GET /customers`                 | List owned customers |
| crm-service  | `POST /customers`                | Create customer      |
| crm-service  | `PUT /customers/:id`             | Update customer      |
| crm-service  | `DELETE /customers/:id`          | Delete customer      |
| crm-service  | `POST /customers/:id/activities` | Add activity         |

## Security model

What is in place:

- bcrypt (cost 12)
- HS256 JWTs, algorithm pinned on verify
- 8-hour token expiry
- Production check for JWT secret strength
- Token verify on gateway and CRM service
- Per-user ownership filters
- Writable-field allowlists
- Input validation / normalization
- Helmet headers
- Request body limits
- Configurable CORS
- Auth rate limiting
- Generic login errors
- Internal network isolation (Docker / AWS)
- Optional HTTPS via ACM
- Secrets Manager
- ECR image scanning
- Immutable SHA-tagged deploys

Gaps / caveats:

- JWT in `localStorage` — XSS can steal it
- Logout is client-only; no server-side revocation
- Roles exist on users/tokens, but RBAC is not enforced yet
- Rate limiter is in-memory per process (use Redis / edge at scale)
- Production still wants WAF, tighter DB networking, backups, and alarm actions

## Local development

### Prerequisites

- Node.js 20+
- npm
- MongoDB 7 (if not using Docker)
- Docker + Compose (for container runs)

### Install

```bash
npm ci
```

### Configure

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set `JWT_SECRET` to a long random value.

### Run all workspaces

```bash
npm run dev
```

Defaults:

| Component       | Address                         |
| --------------- | ------------------------------- |
| Web             | `http://localhost:5173`         |
| GraphQL gateway | `http://localhost:4000/graphql` |
| Auth service    | `http://localhost:4001`         |
| CRM service     | `http://localhost:4002`         |
| MongoDB         | `mongodb://localhost:27017`     |

### Run with Docker Compose

```bash
docker compose up --build
```

- Web UI: `http://localhost:8080`
- GraphQL: `http://localhost:4000/graphql`

MongoDB and internal services stay on the Compose network (not published to the host).

## Configuration

| Variable                    | Used by            | Default                   | Description                                                   |
| --------------------------- | ------------------ | ------------------------- | ------------------------------------------------------------- |
| `NODE_ENV`                  | Backend services   | Development behavior      | Enables production secret checks                              |
| `JWT_SECRET`                | Gateway, auth, CRM | Development-only fallback | Shared JWT signing key                                        |
| `MONGO_URI`                 | Auth, CRM          | Local MongoDB URLs        | Database connection string                                    |
| `PORT`                      | Each backend       | Service-specific          | HTTP listening port                                           |
| `AUTH_SERVICE_URL`          | Gateway            | `http://localhost:4001`   | Internal auth URL                                             |
| `CRM_SERVICE_URL`           | Gateway            | `http://localhost:4002`   | Internal CRM URL                                              |
| `CORS_ORIGINS`              | Gateway            | Local web origins         | Comma-separated allowed origins                               |
| `ALLOWED_ORIGINS`           | Gateway            | Legacy alias              | Fallback alias for CORS origins                               |
| `UPSTREAM_TIMEOUT_MS`       | Gateway            | `5000`                    | Internal request timeout                                      |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Auth               | `60000`                   | Rate-limit window                                             |
| `AUTH_RATE_LIMIT_MAX`       | Auth               | `20`                      | Requests allowed per requester IP/path/window (process-local) |
| `VITE_GRAPHQL_URL`          | Web build          | Local gateway URL         | Browser GraphQL endpoint                                      |

## Testing and quality

```bash
npm test
npm run lint
npm run format:check
npm run build
npm run check
```

Coverage highlights:

- GraphQL schema + auth behavior
- Gateway upstream errors / timeouts
- Auth validation, login, rate limiting
- CRM health, auth protection, validation, mass-assignment cases
- Session persistence and bad storage
- Login / register components
- Customer create/delete and empty state

CI runs install, lint, tests, builds, format check, prod dependency audit, Compose validation, and Terraform init/validate.

## Docker architecture

```mermaid
flowchart LR
    HostBrowser[HostBrowser]
    WebPort["localhost:8080"]
    GatewayPort["localhost:4000"]

    subgraph ComposeNetwork [DockerComposeNetwork]
        WebContainer["web :80"]
        GatewayContainer["api-gateway :4000"]
        AuthContainer["auth-service :4001"]
        CRMContainer["crm-service :4002"]
        MongoContainer[("mongo :27017")]
    end

    HostBrowser --> WebPort --> WebContainer
    HostBrowser --> GatewayPort --> GatewayContainer
    GatewayContainer --> AuthContainer
    GatewayContainer --> CRMContainer
    AuthContainer --> MongoContainer
    CRMContainer --> MongoContainer
```

Dockerfiles install from the root lockfile. Backend images run as the Node user and define health checks. Frontend is nginx with basic security headers.

## AWS deployment

```mermaid
flowchart LR
    Internet[Internet]
    ALB["ApplicationLoadBalancer - HTTP or HTTPS"]
    WebTasks["ECSWebTasks"]
    GatewayTasks["ECSGatewayTasks"]
    CloudMap[AWSCloudMap]
    AuthTasks["ECSAuthTasks"]
    CRMTasks["ECSCRMTasks"]
    Atlas[("MongoDBAtlas")]
    Secrets[AWSSecretsManager]
    Logs[CloudWatchLogsAndAlarms]
    ECR[AmazonECR]

    Internet --> ALB
    ALB -->|default| WebTasks
    ALB -->|"/graphql and /health"| GatewayTasks
    GatewayTasks --> CloudMap
    CloudMap --> AuthTasks
    CloudMap --> CRMTasks
    AuthTasks --> Atlas
    CRMTasks --> Atlas
    Secrets --> GatewayTasks
    Secrets --> AuthTasks
    Secrets --> CRMTasks
    ECR --> WebTasks
    ECR --> GatewayTasks
    ECR --> AuthTasks
    ECR --> CRMTasks
    WebTasks --> Logs
    GatewayTasks --> Logs
    AuthTasks --> Logs
    CRMTasks --> Logs
```

Terraform sets up ECR, ECS tasks/services, ALB, Cloud Map, security groups, Secrets Manager, CloudWatch logs, autoscaling, and alarms. You pass in existing VPC/subnet IDs. Private subnets need NAT or the right VPC endpoints.

GitHub Actions uses OIDC, builds images tagged with the commit SHA, registers a new task definition, updates the ECS service, and waits until stable. Details: [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md).

## Known limitations

- UI does not expose customer update or activity management yet
- `me` exists in GraphQL but the UI does not use it
- JWT only — no refresh tokens or revocation store
- Session in `localStorage`, not httpOnly cookies
- Roles are stored; RBAC is not implemented
- Ownership is per user, not org/team
- Pagination is offset/limit with no total count
- Embedded activities are fine at small scale, awkward for heavy analytics
- Backends are JavaScript; frontend is TypeScript
- Auth rate limiter is not distributed
- Terraform assumes an existing VPC, subnets, MongoDB provider, and GitHub OIDC role

## License

No license file yet. Add one before you distribute the project.
