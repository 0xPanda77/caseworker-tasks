# Caseworker Tasks

A small system for caseworkers to create, view, update and delete their tasks.

- **api/**: REST API (Node, TypeScript, Hono, Zod, Drizzle ORM, PostgreSQL)
- **web/**: frontend based on the HMCTS dev test frontend starter (Express, Nunjucks, GOV.UK Frontend)

## Features

- See all tasks in one list, soonest due first, with a status tag on each and overdue tasks flagged.
- Create a task with a title, optional description, status and due date and time.
- Enter the due time as "14:30" or "2:30pm", in UK time.
- View a task's full details.
- Change a task's status (To do, In progress, Done).
- Delete a task after a confirmation page.
- Get clear error messages next to the fields that need fixing, with what you typed kept in the form.
- Use every page without JavaScript.

## Quick start

Requires Docker.

```sh
docker compose up --build
```

| Service  | URL                                |
| -------- | ---------------------------------- |
| Web      | http://localhost:3100              |
| API      | http://localhost:4000              |
| API docs | http://localhost:4000/docs         |
| OpenAPI  | http://localhost:4000/openapi.json |

The API applies database migrations on start. Stop with `docker compose down` (add `-v` to delete data).

## Local development

Prerequisites: Node 24, Corepack enabled (`corepack enable`), Docker for Postgres.

```sh
# Postgres only (creates databases `tasks` and `tasks_test`)
docker compose up -d db
```

### API (pnpm)

```sh
cd api
cp .env.example .env
pnpm install
export $(grep -v '^#' .env | xargs)
pnpm db:migrate:dev   # apply migrations
pnpm dev              # http://localhost:4000
```

| Script             | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | Run with reload (tsx)                        |
| `pnpm build`       | Compile to `dist/`                           |
| `pnpm start`       | Run the compiled server                      |
| `pnpm test`        | Vitest (uses `DATABASE_URL_TEST`)            |
| `pnpm typecheck`   | `tsc --noEmit`                               |
| `pnpm lint`        | ESLint + Prettier check                      |
| `pnpm db:generate` | Generate a SQL migration from the schema     |
| `pnpm db:migrate`  | Apply migrations (compiled; `:dev` uses tsx) |

### Web (yarn)

```sh
cd web
yarn install
yarn build
API_URL=http://localhost:4000 yarn start   # http://localhost:3100
```

| Script             | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `yarn build`       | Bundle assets and copy GOV.UK templates         |
| `yarn start`       | Run the server                                  |
| `yarn start:dev`   | Run with reload (HTTPS, self-signed cert)       |
| `yarn test:unit`   | Jest unit tests                                 |
| `yarn test:routes` | Jest route tests (run `yarn build` first)       |
| `yarn lint`        | stylelint, ESLint and Prettier check            |
| `yarn tsc --noEmit`| Typecheck                                       |

### Web routes

| Method | Path                | Page / action                                          |
| ------ | ------------------- | ------------------------------------------------------ |
| GET    | `/`                 | Redirect to `/tasks`                                   |
| GET    | `/tasks`            | Task list                                              |
| GET    | `/tasks/new`        | Create form                                            |
| POST   | `/tasks`            | Create, then redirect to the new task                  |
| GET    | `/tasks/:id`        | Task detail                                            |
| GET    | `/tasks/:id/status` | Change status form                                     |
| POST   | `/tasks/:id/status` | Update status, then redirect to the task               |
| GET    | `/tasks/:id/delete` | Delete confirmation page                               |
| POST   | `/tasks/:id/delete` | Delete, then redirect to `/tasks`                      |

Invalid form submissions re-render the form with a 400, a GOV.UK error summary and inline field errors.

## API

Full, interactive documentation is generated from the Zod schemas and served at `/docs`.

| Method | Path                 | Success | Errors        |
| ------ | -------------------- | ------- | ------------- |
| POST   | `/tasks`             | 201     | 400, 500      |
| GET    | `/tasks`             | 200     | 500           |
| GET    | `/tasks/{id}`        | 200     | 400, 404, 500 |
| PATCH  | `/tasks/{id}/status` | 200     | 400, 404, 500 |
| DELETE | `/tasks/{id}`        | 204     | 400, 404, 500 |
| GET    | `/health`            | 200     |               |

Errors use [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details (`application/problem+json`). A 400 lists one entry per problem in `errors`:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/tasks",
  "errors": [
    { "field": "title", "message": "Invalid input: expected string, received undefined" },
    { "field": "priority", "message": "Unknown field" }
  ]
}
```

## Testing

### API

```sh
docker compose up -d db
cd api && pnpm test
```

- **Schema unit tests** (`schemas.test.ts`): the Zod rules on their own, such as trimming, length limits, date-time formats, allowed statuses and unknown fields.
- **Service tests** (`taskService.test.ts`): the task service against a real Postgres test database, covering sorting, `RETURNING`, defaults and nulls.
- **Endpoint integration tests** (`tasks.test.ts`, `health.test.ts`, `not-found.test.ts`): requests through the real app and database. They cover every success path, 404s, each validation 400 and a 500 that leaks no internals.

Tests use a separate database (`DATABASE_URL_TEST`, default `postgres://postgres:postgres@localhost:5432/tasks_test`) and run one file at a time, because the files share and truncate the same table.

### Web

```sh
cd web
yarn build
yarn test:unit
yarn test:routes
```

- **Unit tests** (`src/test/unit/`): the API client's mapping of responses to results, form parsing and validation, London time conversion and formatting, and status helpers.
- **Route tests** (`src/test/routes/`): every page and form through supertest, with the API client mocked. They cover success redirects, validation errors, API 400s mapped onto fields, not found pages and the error page.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build for both apps, with a Postgres service for the API tests.

## Project structure

```
api/
  src/
    app.ts            app factory: routes, docs, validation errors, error handling
    index.ts          server entry point
    env.ts            validated environment config
    db/               Drizzle schema, client, migrate script
    schemas/          Zod request/response schemas
    routes/           OpenAPI route definitions and handlers
    services/         task business logic
    lib/              problem-details helper
    middleware/       error and not-found handlers
  drizzle/            generated SQL migrations
  test/               Vitest tests
web/
  src/main/
    app.ts            Express app, 404 and error handlers
    routes/           home redirect and task pages
    services/         typed API client
    utils/            form validation, dates, status labels
    views/            Nunjucks templates
  src/test/
    unit/             Jest unit tests
    routes/           Jest route tests (API client mocked)
docker/               Postgres init script
docker-compose.yml
.github/workflows/    CI
```

## Design decisions

### Stack

- **Node and TypeScript instead of the Java backend starter, with the HMCTS frontend starter kept.** The brief allows any language, so I picked the stack I can explain in depth. The frontend starter is HMCTS's own stack, and the GOV.UK Design System gives accessible patterns that work without JavaScript.
- **Hono with `@hono/zod-openapi`.** One Zod schema per endpoint drives validation, the TypeScript types and the OpenAPI docs, so they cannot drift apart.
- **Drizzle ORM.** A thin, typed ORM that stays close to SQL and generates migrations.

### API

- **RFC 9457 problem details for every error.** Every 400, 404 and 500 has the same shape and content type, so a client needs only one way to handle errors.
- **Unknown fields are rejected and named.** Request bodies are strict, and each unrecognised key gets its own entry in `errors`, so a typo in a field name is easy to spot.
- **Status update is its own endpoint (`PATCH /tasks/{id}/status`).** The brief only asks to update the status, and a narrow endpoint cannot change other fields by accident.
- **The service returns `undefined` for a missing task instead of throwing.** A missing task is an expected outcome, and it keeps HTTP out of the service; the handler decides it means 404.
- **Update and delete use `RETURNING`.** One query makes the change and says whether the row existed, with no separate lookup that could race with the write.
- **The list sorts by `dueAt`, then `createdAt`, then `id`.** Without tiebreaks Postgres can return tasks with the same due date in any order, which makes the list and the tests unstable.
- **`updated_at` is set with Drizzle's `$onUpdate`.** It is simple and needs no migration; the trade-off is that it only covers writes made through Drizzle.
- **500s are handled in one place.** `app.onError` logs the real error and returns a generic problem response, so handlers have no try/catch and internals never leak.

### Testing

- **Tests run against a real Postgres database.** The logic worth testing is the SQL itself (sorting, `RETURNING`, defaults, nulls), and a mock would only test my assumptions about it.

### Web

- **The web app validates forms as well as the API.** It gives GOV.UK style messages and keeps what the user typed. The API stays the source of truth, so its 400s are mapped back onto form fields too.
- **The API client returns result objects (`ok`, `notFound`, `invalid`) instead of throwing for 404 and 400.** The types force every route to handle those expected outcomes. Only unexpected failures throw and reach the error page.
- **Due times are entered in London local time and stored as UTC.** The GMT or BST offset comes from `Intl`, and times are shown back in Europe/London.
- **The GOV.UK date input plus a text field for the time.** GOV.UK has no time component, and native time pickers behave inconsistently across browsers and assistive technology.
- **Success banners use query flags such as `?created=1`.** They are stateless, need no session store and work without JavaScript. Each flag only switches on fixed text, so nothing can be injected.
- **Forms use POST-redirect-GET with a 303.** Refreshing the next page does not resubmit the form, and 303 tells the browser to follow up with a GET.
- **No CSRF protection yet.** There is no login, so there is no session for a forged request to ride on. CSRF tokens become necessary once auth is added.
- **Fixed the starter's error handler.** It took 3 arguments, but Express only treats middleware with 4 arguments as an error handler, so thrown errors never reached it. I also added a catch-all 404 page.

## Known limitations

- A due time inside the hour the clocks skip in spring (for example 1:30am on the last Sunday in March) does not exist in London time and converts slightly off.
- A success banner reappears if the page is refreshed, because it comes from the query string.
- There is no authentication, authorisation or CSRF protection.

## Next steps

Out of scope for this version:

- Authentication, then CSRF tokens on every form (the starter already has a macro for them)
- Users and task assignment
- Editing task fields other than status
- Pagination and filtering on the list
- Audit trail of changes
- Automated accessibility testing (for example axe)
- Monitoring and structured logging
- A database trigger for `updated_at` if anything other than the app ever writes to the table
- Kubernetes deployment
