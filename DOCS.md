# Document Technique de Reference - @nxpress/core

Ce document detaille l'ensemble des fonctionnalites et conventions du package `@nxpress/core`. Il est destine a servir de reference exhaustive pour la generation de la documentation finale.

---

## 1. Vue d'ensemble et CLI

`@nxpress/core` est un framework pour Node.js base sur Express.js qui fournit un routage base sur les fichiers, la gestion des composants et layouts d'affichage, ainsi qu'un systeme de middlewares en cascade.

### Commandes CLI
Le CLI s'exécute via les binaires `nxpress` ou `nxp` :
- `nxpress dev` : Démarre le serveur en mode développement avec rechargement à chaud (Hot Reload) sans mise en cache des middlewares ou handlers.
- `nxpress start` : Démarre le serveur en mode production.

---

## 2. Routage base sur les fichiers (`app/`)

L'arborescence du dossier `app/` definit les routes de l'application.

### Types de fichiers
- Fichiers de vue : `.ejs`, `.njk`, `.nunjucks`, `.hbs`, `.liquid`, `.html`
- Fichiers compagnons de vues : `.ts` ou `.js` portant le meme nom que la vue (ex: `index.ts` pour `index.ejs`)
- Fichiers de routes API : Tout fichier `.ts` ou `.js` situe dans `app/api/`
- Fichiers de middlewares de dossier : `middleware.ts` ou `middleware.js`

### Syntaxe des routes dynamiques
- `app/products/[id].ejs` -> Route `/products/:id`
- `app/blog/[...slug].ejs` -> Route `/blog/*`
- `app/index.ejs` -> Route `/`

### Fichiers reserves
- `layout.ejs` (ou extension du moteur) : Layout imbrique
- `middleware.ts` / `middleware.js` : Middleware de dossier (non route)
- `404.ejs`, `500.ejs`, `not-found.ejs`, `error.ejs` : Pages d'erreurs personnalisees

---

## 3. Fichiers compagnons de vue (`app/**/*.ts`)

Chaque page de vue peut etre accompagnee d'un fichier TypeScript/JavaScript pour charger des donnees avant le rendu.

### Export des props
La méthode recommandee pour retourner des donnees a la vue est l'export par defaut.

```ts
import type { Request, Response } from '@nxpress/core';

export default async function props(req: Request, res: Response) {
  const products = [
    { id: 1, name: 'Laptop', price: 999 }
  ];

  return {
    title: 'Boutique',
    products
  };
}
```

Retrocompatibilite : La fonction nommee `export async function props(req, res)` est egalement supportee.

### Cles reservees du systeme
Les cles suivantes sont reservees et injectees automatiquement dans les vues : `G`, `global`, `R`, `req`, `E`, `env`, `$`, `tailwind`.

---

## 4. Routes API (`app/api/**/*.ts`)

Tout fichier situe sous `app/api/` est traite comme une route API.

### Handlers par methode HTTP
Chaque methode HTTP est definie par une fonction nommee exportee (`get`, `post`, `put`, `delete`, `patch`).

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
    message: 'Donnees enregistrees'
  };
}
```

### Handler par defaut
Si aucune methode nommee ne correspond, `export default function(req, res)` intercepte toutes les requetes HTTP sur la route.

### Reponse automatique (Auto-Return)
Si une fonction de route API retourne une valeur :
- Un objet ou tableau est automatiquement envoye via `res.json(valeur)`.
- Une chaine ou un Buffer est automatiquement envoye via `res.send(valeur)`.
- Si `res.status(...)` a ete appele, le code de statut HTTP configure est conserve.
- Si le handler n'appelle pas `res.send`/`res.json` et ne retourne rien, `next()` est appele automatiquement.

---

## 5. Middlewares de dossier (`middleware.ts` / `middleware.js`)

Le nom `middleware.ts` (ou `.js`) est reserve. Il n'est jamais traite comme une vue ou un fichier compagnon.

### Cascade par dossier
Un fichier `middleware.ts` s'applique au dossier dans lequel il se trouve ainsi qu'a tous ses sous-dossiers et routes.
- `app/middleware.ts` -> S'applique a toute l'application (global).
- `app/admin/middleware.ts` -> S'applique a `/admin/*`.

### Collecte des exports
Dans un fichier `middleware.ts`, toutes les fonctions exportees (fonctions nommees, `export default`, ou tableaux de fonctions) sont automatiquement collectees et executees dans l'ordre.

```ts
import type { Request, Response } from '@nxpress/core';

// Exclusion de routes
export const ignore = ['/api/health', '/public/*'];

export function logger(req: Request, res: Response) {
  console.log(`[LOG] ${req.method} ${req.path}`);
}

export function setSecurityHeader(req: Request, res: Response) {
  res.setHeader('X-Frame-Options', 'DENY');
}
```

### Exclusion de routes (`ignore`)
L'export `ignore` accepte un tableau de chemins ou de motifs avec wildcards (`*`). Les routes correspondantes sautent l'execution du middleware du dossier.

---

## 6. Middlewares de route (fichiers compagnons et API)

Pour cibler une route specifique, deux exports stricts sont disponibles dans les fichiers compagnons (`app/**/*.ts`) et API (`app/api/**/*.ts`).

### 1. Export `middleware` (Singulier)
Doit etre une fonction unique. Si `middleware` est un tableau, Nxpress lève une erreur.

```ts
import type { Handler } from '@nxpress/core';

export const middleware: Handler = (req, res) => {
  res.setHeader('X-Route-Scope', 'single');
};
```

### 2. Export `middlewares` (Pluriel)
Doit etre un tableau de fonctions. Si `middlewares` est une fonction unique, Nxpress lève une erreur.

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

### Fusion des middlewares de route
Si `middleware` ET `middlewares` sont exportes dans le meme fichier, ils sont fusionnes et executes dans l'ordre : d'abord `middleware`, puis les elements de `middlewares`.

---

## 7. Modele d'execution des middlewares

### Appel `next()` optionnel
Les middlewares n'ont pas l'obligation d'appeler `next()`. Si une fonction termine son execution sans retourner de reponse et sans appeler `next()`, Nxpress passe automatiquement au middleware ou handler suivant.

### Compatibilite avec les packages Express
Les middlewares Express traditionnels qui attendent 3 parametres `(req, res, next)` et appellent `next()` manuellement (comme `cors()`, `helmet()`, etc.) restent 100% compatibles sans double execution.

### Rechargement a chaud (Hot Reload)
En mode developpement (`nxpress dev`), les middlewares et handlers sont enveloppes dynamiquement. Toute modification apportee a un fichier `middleware.ts` ou a un fichier de route s'applique immediatement a la requete HTTP suivante sans mise en cache obsolete.

### Formatage des erreurs
Toutes les erreurs de configuration de middlewares affichent des chemins de fichiers relatifs a la racine du projet (ex: `app/index.ts`).

---

## 8. Exports et Typages du Package

Le module `@nxpress/core` re-exporte les utilitaires et types principaux :

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

- `Handler` / `RequestHandler` : Type standard pour definir les handlers et middlewares Express.
- `Request`, `Response`, `Express`, `NextFunction` : Types Express re-exportes pour eviter les dependances directes.
