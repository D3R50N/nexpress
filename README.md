<div align="center">
  <img src="assets/logo.png" alt="Nxpress Logo" width="140" />
  <h1>Nxpress</h1>
  <p><strong>A Next.js-like Framework for Express.js</strong></p>

  [![npm version](https://img.shields.io/npm/v/@nxpress/core.svg?style=flat-square)](https://www.npmjs.com/package/@nxpress/core)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
</div>

\
Nxpress (`@nxpress/core`) brings modern frontend developer experience to classic Express.js applications. It introduces **file-based routing**, **nested layouts**, **components**, and **auto-compiling Tailwind CSS** to traditional server-side rendered (SSR) engines like Handlebars, EJS, and HTML.

## Features

- **File-Based Routing:** Define your routes naturally by placing files in an `app/` or `pages/` directory.
- **Nested Layouts:** Share UI across routes with nested `layout.<ext>` files, just like Next.js App Router.
- **Custom Error Pages:** Easily define custom `app/404.<ext>` and `app/500.<ext>` error pages with optional companion `.ts` data loaders.
- **Live Reload (SSE):** Automatic browser reloading on file edits via Server-Sent Events (`/nxpress/live-reload`).
- **Smart Dev Server:** Instant in-memory cache invalidation without full HTTP server restarts for view and companion edits.
- **Clean Console Logging:** Automatic deduplication of consecutive duplicate CLI logs and `@clack/prompts` progress spinners.
- **Smart Components:** Drop reusable components in a `components/` folder and render them anywhere, case-insensitively.
- **Tailwind CSS Built-In:** Zero-config Tailwind CSS v4 support. Hot-reloads on input CSS (`app.css`) edits automatically.
- **Instant Companion HMR:** Fetch and provide data via companion `.ts` files exporting `props(req, res)` with zero-staleness `jiti` reloading.
- **Clean Request Context (`R`):** Access `R` (or `req`) safely in views (`R.url`, `R.path`, `R.base`, `R.full`, `R.query`, `R.params`, `R.method`, `R.headers`, `R.cookies`, `R.ip`, `R.protocol`, `R.host`).
- **Auto Globals & Helpers:** Comes with rich globals (`env`, `year`, `now`, `G`) and extensive template helpers built right in.
- **CLI Included:** Built-in `nxpress dev` (with manual `r` key restart) and `nxpress start` for production.

---

## Installation & Scaffolding

Scaffold a new project using `create-nxpress-app`:

```bash
npx create-nxpress-app
```

During scaffolding, choose your package manager (`pnpm` by default, `npm`, `yarn`, `bun`, `deno`). Dependencies are installed automatically.

Or install Nxpress manually:

```bash
# Local installation
npm install @nxpress/core
# or
pnpm add @nxpress/core

# Global installation (for CLI)
npm install -g @nxpress/core
# or
pnpm add -g @nxpress/core
```

*Note: Depending on your engine of choice, you may also need to install `hbs` or `ejs`. **Handlebars (`hbs`) is recommended** for its clean and flexible syntax.*

## CLI Usage

Nxpress comes with a powerful CLI for local development and production (`nxpress` or `nxp`).

### Development Server

Starts a local development server with hot file watching and live Tailwind compilation:

```bash
# Via npx (local)
npx nxpress dev

# Global command (or nxp alias)
nxpress dev
nxp dev
```

**Options:**

- `-p, --port <number>`: Port number
- `-e, --engine <engine>`: Template engine (`hbs`, `ejs`, `html`)
- `-t, --tailwind`: Enable Tailwind compilation (default: true)

### Production Server

Starts the production-optimized server:

```bash
# Via npx (local)
npx nxpress start

# Global command
nxpress start
nxp start
```

## Project Structure

Nxpress relies on a simple, intuitive directory structure:

```text
my-nxpress-app/
├── components/          # Reusable components
│   ├── Navbar.hbs
│   └── Footer.ejs
├── app/                 # File-based routes & API
│   ├── layout.hbs       # Root layout file
│   ├── index.hbs        # Renders the homepage (/)
│   ├── index.ts         # Server-side data loader for homepage
│   ├── 404.hbs          # Custom 404 Not Found page
│   ├── 500.hbs          # Custom 500 Internal Server Error page
│   ├── products/
│   │   ├── layout.hbs   # Nested layout for /products/*
│   │   ├── [id].hbs     # Dynamic route (e.g., /products/123)
│   │   └── [id].ts      # Data loader for dynamic route
│   └── api/
│       └── health.ts    # Standard Express API route
├── public/              # Static assets
├── nxpress.config.json  # Optional Nxpress configuration
└── package.json
```

## Configuration

You can configure Nxpress via a `nxpress.config.json` or `nxpress.config.js` in your project root:

```json
{
  "port": 3000,
  "engine": "hbs",
  "appDir": "app",
  "componentsDir": "components",
  "publicDir": "public",
  "tailwind": true,
  "globals": {
    "siteName": "My Awesome App",
    "author": "My Team"
  }
}
```

## Core Concepts

### 1. Routing & Layouts

Place an `index.hbs` in `app/` to map to `/`.
Place a file in `app/about/index.hbs` or `app/about.hbs` to map to `/about`.
Create a `layout.hbs` in any directory. The layout wraps all templates inside its folder and subfolders using the `{{{body}}}` tag.

### 2. Custom Error Pages (404 & 500)

Nxpress automatically handles custom error pages:

- **404 Not Found:** Place `404.hbs` (or `404.ejs`/`404.html`) in `app/`. Optionally add `404.ts` for companion data.
- **500 Server Error:** Place `500.hbs` (or `500.ejs`/`500.html`) in `app/`. Optionally add `500.ts` for companion data.

### 3. Server-Side Data Fetching

Next to any template, create a TypeScript file with the same name. Export a `props` function to inject data into the view.

```typescript
// app/products/[id].ts
import type { Request, Response } from 'express';

export async function props(req: Request, res: Response) {
  const product = await db.getProduct(req.params.id);
  
  // These properties are passed directly to [id].hbs
  return { 
    title: product.name,
    product 
  };
}
```

### 4. Using Components

Place a `Navbar.hbs` in `components/`. You can render it in any view, passing arguments as needed.

**Handlebars (`hbs`):**

```handlebars
{{$ 'Navbar' title="Home Page" user=user}}
```

**EJS (`ejs`):**

```ejs
<%- $('Navbar', { title: 'Home Page', user: user }) %>
```

### 5. Global Variables & Clean Request Context (`R`)

Nxpress automatically injects useful context into your templates:

- `R` or `req`: A clean, non-circular request object:
  - `R.url`: Relative URL path & query (e.g., `"/products?sort=asc"`)
  - `R.path`: Relative path (e.g., `"/products"`)
  - `R.base`: Base URL origin (e.g., `"http://localhost:3000"`)
  - `R.full`: Full absolute URL (e.g., `"http://localhost:3000/products?sort=asc"`)
  - `R.method`: HTTP method (e.g., `"GET"`)
  - `R.query`: Parsed query parameters object
  - `R.params`: Parsed route parameters object
  - `R.headers`: Request headers
  - `R.cookies`: Request cookies
  - `R.ip`: Client IP address
  - `R.protocol`: Protocol (`"http"` / `"https"`)
  - `R.host`: Host header (`"localhost:3000"`)
- `G` or `global`: Values defined in `nxpress.config.json` globals.
- `E` or `env`: Process environment variables.
- `tailwind`: Automatic Tailwind CSS `<link>` tag.
- `year`, `now`: Date utilities.

### 6. Tailwind CSS Integration

Tailwind CSS v4 is automatically compiled and injected into the `<head>` tag when rendering pages wrapped in a layout. Hot reloading watches `app.css` edits automatically.

### 7. Browser Live Reloading (SSE)

Nxpress automatically injects a lightweight Server-Sent Events (SSE) script during development. When any template, companion file, or stylesheet is edited, the server sends a reload signal to `/nxpress/live-reload` and the browser reloads instantly.

### 8. Smart Dev Server & Keyboard Shortcuts

- **Instant In-Memory Reloads:** Edits to templates, companion `.ts` files, or CSS clear in-memory caches without restarting the HTTP server.
- **Full Server Restarts:** Only triggered when server configuration (`nxpress.config.json`, `.env`) or file-based route structures change.
- **Manual Restart Shortcut:** Press `r` in the CLI terminal at any time to trigger a full manual server restart.

## Programmatic Usage

### Quick Start (`serve`)

```typescript
import { serve } from '@nxpress/core';

serve({
  port: 3000,
  engine: 'hbs',
  globals: {
    siteName: 'My Custom Server',
  },
});
```

### Custom Express Instance (`nxpress`)

Use `nxpress` to obtain the Express app instance, allowing you to attach custom middleware or additional routes:

```typescript
import { nxpress } from '@nxpress/core';

const app = nxpress({
  engine: 'hbs',
  globals: {
    siteName: 'My Custom App',
  },
});

// Add custom middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Add custom routes
app.get('/custom-route', (req, res) => {
  res.json({ message: 'Hello from custom route!' });
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## License

MIT © Nxpress
