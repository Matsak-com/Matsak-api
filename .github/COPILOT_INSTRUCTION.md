```markdown
# Copilot instruction for the Matsak-api repository

Use this text as the repository-specific instruction for GitHub Copilot or station it as a developer prompt when asking the assistant to change code.

## Repository Overview

**Matsak** is a NestJS application providing a medication search and order platform for pharmacies. User can also check nearby pharmacies in map from their location.

## High-level summary
- Tech: Node.js 20, NestJS (TS), pnpm, Zod for runtime validation, MongoDB, migrations (migrate-mongo), AWS S3 for file storage, Docker / docker-compose for dev and production.
- Project structure: controllers in `src/*/*.controller.ts`, services in `src/*/*.service.ts`, repositories in `src/*/*.repository.ts`, Zod schemas in `src/common/schemas/`, common decorators/pipes/interceptors under `src/common/`.

## Goals for suggestions and generated code
- Keep changes small, explicit and idiomatic TypeScript + NestJS.
- Prefer Zod schemas (`src/common/schemas/*.ts`) for request validation; keep DTOs (class-validator) for typing compatibility where used.
- Validate multipart/form-data using Multer (`@UseInterceptors(FileInterceptor(...))`) and then run Zod validation after Multer (use `ZodMultipartInterceptor` or validate inside handler). Ensure the interceptor/parsing happens before pipes.
- All public APIs must return typed domain objects (use repository `Team` / `Product` schemas where applicable) and avoid leaking raw DB objects.
- Use async/await and handle errors consistently. Throw NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.) with structured messages (use the same shape the project already uses: `{ message: 'Validation failed', errors: [...] }`).
- follow NestJS best practices.
- Be sure to use SOLID principles where applicable.

### Required Before Each Commit
- Run `pnpm run lint` to ensure code follows project standards
- When adding new functionality, make sure you update the README
- Make sure that the repository structure documentation is correct and accurate in the Copilot Instructions file

## Conventions and style
- 2-space indentation; keep formatting consistent with ESLint/Prettier config in repo.
- Import paths: prefer relative imports inside `src` and absolute `src/...` only where existing code uses them. Match existing file organization and naming.
- When adding validation, update both Zod schema and, if relevant, TypeScript types via `z.infer<typeof schema>` to keep types aligned. Cast carefully when necessary.
- For file uploads: store `Express.Multer.File` on DTO/args and pass to `AwsS3Service.uploadFile()` in services (do not call S3 directly from controllers).

## Docker and dev flow hints
- Use `Dockerfile.dev` for local builds; `docker-compose.dev.yml` mounts `.:/app` and a named volume for `/app/node_modules` (`matsak_node_modules`).
- For dependency changes run: `docker-compose -f docker-compose.dev.yml up --build --force-recreate -d api` or locally `pnpm install && pnpm run build`.

## Testing and quality gates
- Add unit tests next to the module under `src/*/*.spec.ts` using Jest (existing tests follow this pattern).
- Run `pnpm run lint` and `pnpm run build` after changes.

## Avoid
- Don't duplicate DB logic in controllers; keep business logic in services.
- Don't commit secrets or .env files.

## Example prompts to use with Copilot
- "Implement a POST /teams endpoint that accepts multipart form (logo), validates the body with `createTeamSchema`, stores the logo to S3, and creates a Team document — follow existing services/repository patterns."
- "Refactor `image-product.service.ts` to use the `BaseRepository` methods for create/find/update and add types. Keep API backward compatible."
- "Add a new interceptor `ZodMultipartInterceptor` that validates `req.body` with a Zod schema after Multer runs; return 400 with `{ message: 'Validation failed', errors: [...] }` on error."

Paste this into Copilot's custom instruction or prefix your request with it so suggestions match the repository's architecture and standards.

```
