# Technical Reference Documentation - @nxpress/core

This document details all features and conventions of the `@nxpress/core` package. It serves as an exhaustive reference for generating final documentation.

---

## 1. Overview and CLI

`@nxpress/core` is an Express.js-based framework for Node.js providing file-based routing, template components, cascading middlewares, and automatic response handling.

### CLI Commands

The CLI is executed via `nxpress` or `nxp` binaries:

- `nxpress dev`: Starts the development server with Hot Reload and dynamic no-cache evaluation for middlewares and route handlers.
- `nxpress start`: Starts the production server.

---

## 2. File-Based Routing Architecture (`app/`)

The directory structure inside `app/` defines the application routes.

### Supported File Types

- View templates: `.ejs`, `.njk`, `.nunjucks`, `.hbs`, `.liquid`, `.html`
- Page companion files: `.ts` or `.js` files sharing the same base name as the view (e.g. `index.ts` for `index.ejs`)
- API route files: Any `.ts` or `.js` file located under `app/api/`
- Folder middleware files: `middleware.ts` or `middleware.js`

### Dynamic Route Syntax

- `app/products/[id].ejs` -> Route `/products/:id`
- `app/blog/[...slug].ejs` -> Route `/blog/*`
- `app/index.ejs` -> Route `/`

### Reserved Filenames

- `layout.ejs` (or view engine extension): Nested layout template
- `middleware.ts` / `middleware.js`: Directory-level middleware (never routed)
- `404.ejs`, `500.ejs`, `not-found.ejs`, `error.ejs`: Custom error pages

---

## 3. Page Companion Files (`app/**/*.ts`)

Every view template page can be paired with a TypeScript/JavaScript companion file to fetch data before rendering.

### Props Export

The recommended way to return data to a view is via default export.

```ts
import type { Request, Response } from '@nxpress/core';

export default async function props(req: Request, res: Response) {
  const products = [
    { id: 1, name: 'Laptop', price: 999 }
  ];

  return {
    title: 'Store',
    products
  };
}
```

Backward Compatibility: Named export `export async function props(req, res)` is also supported.

### Reserved System Keys

The following keys are reserved and automatically injected into view templates: `G`, `global`, `R`, `req`, `E`, `env`, `$`, `tailwind`.

---

## 4. API Routes (`app/api/**/*.ts`)

Any file under `app/api/` is registered as an API route handler.

### HTTP Method Handlers

Each HTTP method is defined by an exported named function (`get`, `post`, `put`, `delete`, `patch`).

```ts
import type { Request, Response } from '@nxpress/core';

export function get(req: Request, res: Response) {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
}

export function post(req: Request, res: Response) {
  return {
    success: true,
    message: 'Data saved successfully'
  };
}
```

### Default Fallback Handler

If no matching named HTTP method function is exported, `export default function(req, res)` catches all HTTP requests for that route.

### Automatic Response (Auto-Return)

If an API handler function returns a value:

- An Object or Array is automatically sent via `res.json(...)`.
- A String or Buffer is automatically sent via `res.send(...)`.
- If `res.status(...)` was called prior to returning, the configured status code is preserved.
- If the handler does not call `res.send`/`res.json` and returns nothing, `next()` is automatically called.

---

## 5. Folder-Level Middlewares (`middleware.ts` / `middleware.js`)

The filename `middleware.ts` (or `.js`) is reserved and is never routed as a page or matched as a view companion.

### Directory Cascading

A `middleware.ts` file applies to the directory it resides in and all its subdirectories and child routes.

- `app/middleware.ts` -> Applies to all application routes (global).
- `app/admin/middleware.ts` -> Applies strictly to `/admin/*`.

### Auto-Collection of Exports

Inside `middleware.ts`, all exported functions (named exports, default export, or exported arrays of functions) are automatically collected and executed in declaration order.

```ts
import type { Request, Response } from '@nxpress/core';

// Route exclusions
export const ignore = ['/api/health', '/public/*'];

export function logger(req: Request, res: Response) {
  console.log(`[LOG] ${req.method} ${req.path}`);
}

export function setSecurityHeader(req: Request, res: Response) {
  res.setHeader('X-Frame-Options', 'DENY');
}
```

### Route Exclusions (`ignore`)

The `ignore` export accepts an array of route paths or wildcard patterns (`*`). Matching routes skip execution of the directory middleware.

---

## 6. Route-Level Middlewares (Companion & API Files)

To attach middlewares to a specific route, two strict exports are available in companion (`app/**/*.ts`) and API (`app/api/**/*.ts`) files.

### 1. `middleware` Export (Singular)

Must be a single function. If `middleware` is an Array, Nxpress throws an error.

```ts
import type { Handler } from '@nxpress/core';

export const middleware: Handler = (req, res) => {
  res.setHeader('X-Route-Scope', 'single');
};
```

### 2. `middlewares` Export (Plural)

Must be an Array of functions. If `middlewares` is a single function, Nxpress throws an error.

```ts
import type { Handler } from '@nxpress/core';

export const middlewares: Handler[] = [
  (req, res) => {
    console.log('Middleware 1');
  },
  (req, res) => {
    console.log('Middleware 2');
  }
];
```

### Route Middleware Merging

If both `middleware` AND `middlewares` are exported in the same file, they are merged and executed in order: `middleware` first, followed by elements in `middlewares`.

---

## 7. Middleware Execution Model

### Optional `next()` Calling

Middlewares are not required to call `next()`. If a function completes execution without calling `next()` and without sending a response, Nxpress automatically advances to the next step.

### Express Package Compatibility

Traditional Express middlewares expecting 3 parameters `(req, res, next)` and calling `next()` manually (e.g. `cors()`, `helmet()`) remain 100% compatible without double execution.

### Hot Reloading

In development mode (`nxpress dev`), middlewares and route handlers are wrapped dynamically. Changes to `middleware.ts` or route files take effect on the very next HTTP request without stale caching.

### Error Formatting

All middleware and route configuration errors display file paths relative to the project root (e.g. `app/index.ts`).

---

## 8. Package Exports and Types

The `@nxpress/core` module re-exports core utilities and types:

```ts
import {
  nxpress,
  serve,
  NxpressServerOptions,
  logger,
  Request,
  Response,
  Express,
  NextFunction,
  RequestHandler,
  Handler
} from '@nxpress/core';
```

- `Handler` / `RequestHandler`: Standard Express handler and middleware type re-exported from Express.
- `Request`, `Response`, `Express`, `NextFunction`: Re-exported Express types.
