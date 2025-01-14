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

