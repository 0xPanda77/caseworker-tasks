# Caseworker Tasks: web

The frontend for Caseworker Tasks. It is based on the [HMCTS dev test frontend starter](https://github.com/hmcts/hmcts-dev-test-frontend) (Express, Nunjucks, GOV.UK Frontend, TypeScript, Jest) and talks to the tasks API in `../api`.

See the [root README](../README.md) for the full picture: features, routes, design decisions and how to run everything with Docker.

## Run

Requires Node 24 with Corepack enabled, and the API running (default `http://localhost:4000`).

```sh
yarn install
yarn build                                 # bundle assets with webpack
API_URL=http://localhost:4000 yarn start   # http://localhost:3100
```

`yarn start:dev` runs with reload over HTTPS on a self-signed certificate.

## Test and lint

```sh
yarn test:unit     # unit tests: API client, form validation, dates, status helpers
yarn test:routes   # route tests with supertest, API client mocked
yarn lint          # stylelint, ESLint and Prettier
yarn tsc --noEmit  # typecheck
```

## Key folders

```
src/main/
  app.ts              Express app: middleware, routes, 404 and error handlers
  config.ts           runtime config (API_URL)
  routes/             home redirect and task pages
  services/taskApi.ts typed client for the tasks API
  utils/              form parsing and validation, London time handling, status labels
  views/              Nunjucks templates (tasks/, error pages, layout)
src/test/
  unit/               Jest unit tests
  routes/             Jest route tests
```
