# ⚡ Nxpress (@nxpress/core)

> Modern TypeScript framework for Express.js with `app/` file-based routing, nested `layout.<ext>` inheritance, case-insensitive components, and server-side data loading.

## Features

- 📁 **App Directory Routing**: Routes defined in `app/` (e.g. `app/index.hbs`, `app/products/[id].ejs`, `app/api/health.ts`).
- 🎨 **Supported Template Engines**: `hbs` (Handlebars), `ejs`, and `html`.
- 📐 **Nested `layout.<ext>` System**: Next.js-style layout hierarchy (`/app/layout.hbs`, `/app/products/layout.hbs`). Layout file extension matches active engine.
- 🧩 **Case-Insensitive Component Auto-Registration**: `Navbar`, `navbar`, or `NAVBAR` all resolve components in `components/`.
- 🔄 **Data Loading (`props`)**: Companion `.ts` files exporting `props(req, res)`.
- 🌐 **Automatic Template Globals**:
  - `G` / `global`: Application globals & helper functions.
  - `C` / `context`: Request context (`query`, `params`, `path`, `url`).
  - `E` / `env`: Environment variables (auto-loads `.env`).
  - `year` & `date`: Current year and date.
- 🛠️ **Built-in Template Helpers**: `str`, `json`, `lower`, `upper`, `capitalize`, `truncate`, `len`, `contains`, `includes`, `add`, `sub`, `and`, `or`, `not`, `ternary`.

## Project Structure

```
my-nxpress-app/
├── components/          # Case-insensitive reusable components (.hbs, .ejs, .html)
│   ├── Navbar.hbs
│   └── ProductCard.ejs
├── app/                 # File-based routes, layouts & API
│   ├── layout.hbs       # Root layout file
│   ├── index.hbs        # View template
│   ├── index.ts         # export async function props(req, res)
│   ├── products/
│   │   ├── layout.hbs   # Nested sub-layout for /products/*
│   │   ├── [id].hbs
│   │   └── [id].ts
│   └── api/
│       └── health.ts
├── .env                 # Auto-loaded environment variables
└── package.json
```

## Configuration (`nxpress.config.json`)

You can create an `nxpress.config.json` file in your root directory to configure Nxpress options automatically:

```json
{
  "port": 3000,
  "engine": "hbs",
  "appDir": "app",
  "componentsDir": "components",
  "publicDir": "public",
  "globals": {
    "siteName": "My Nxpress App",
    "author": "My Team"
  }
}
```

## Quick Start

```typescript
import { startServer } from '@nxpress/core';

startServer({
  port: 3000,
  engine: 'hbs', // 'hbs' | 'ejs' | 'html'
  globals: {
    siteName: 'My Nxpress App',
  },
});
```

## Running Examples

```bash
# Run Handlebars example
pnpm example:hbs

# Run EJS example
pnpm example:ejs
```
