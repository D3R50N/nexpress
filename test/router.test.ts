import assert from 'assert';
import path from 'path';
import { fileToRoutePath, findLayoutsForRoute } from '../src/router';
import { builtinHelpers } from '../src/helpers';
import { renderComponent, registerComponents } from '../src/components';
import { getFilteredEnv } from '../src/env';

console.log('Testing fileToRoutePath (TypeScript)...');

assert.strictEqual(fileToRoutePath('index.hbs'), '/');
assert.strictEqual(fileToRoutePath('about.hbs'), '/about');
assert.strictEqual(fileToRoutePath('users/index.hbs'), '/users');
assert.strictEqual(fileToRoutePath('users/[id].hbs'), '/users/:id');
assert.strictEqual(fileToRoutePath('blog/[...slug].hbs'), '/blog/*');
assert.strictEqual(fileToRoutePath('api/health.ts'), '/api/health');

console.log('Testing findLayoutsForRoute...');
const exampleEjsDir = path.resolve('./example/ejs/app');
const layouts = findLayoutsForRoute(path.resolve('./example/ejs'), exampleEjsDir, 'index.ejs', 'ejs');
assert.strictEqual(layouts.length > 0, true);

console.log('Testing builtinHelpers...');
assert.strictEqual(builtinHelpers.str({ a: 1 }), '{"a":1}');
assert.strictEqual(builtinHelpers.str(42), '42');
assert.deepStrictEqual(builtinHelpers.json('{"x":10}'), { x: 10 });
assert.strictEqual(builtinHelpers.lower('HELLO'), 'hello');
assert.strictEqual(builtinHelpers.upper('hello'), 'HELLO');
assert.strictEqual(builtinHelpers.capitalize('hello'), 'Hello');
assert.strictEqual(builtinHelpers.len([1, 2, 3]), 3);
assert.strictEqual(builtinHelpers.add(5, 3), 8);
assert.strictEqual(builtinHelpers.ternary(true, 'yes', 'no'), 'yes');
assert.strictEqual(builtinHelpers.eq(5, 5), true);
assert.strictEqual(builtinHelpers.ne(5, 10), true);

console.log('Testing case-insensitive renderComponent...');
const exampleComponentsDir = path.resolve('./example/ejs/components');
registerComponents(exampleComponentsDir);
const compUpper = renderComponent('ProductCard', { G: { currency: '€' }, product: { name: 'Test', price: 100, category: 'Cat', description: 'Desc', id: 1 } });
const compLower = renderComponent('productcard', { G: { currency: '€' }, product: { name: 'Test', price: 100, category: 'Cat', description: 'Desc', id: 1 } });
assert.strictEqual(compUpper, compLower);

console.log('Testing getFilteredEnv...');
process.env.SECRET_KEY = 'secret123';
process.env.PUBLIC_API_URL = 'https://api.example.com';
const fullEnv = getFilteredEnv(false);
const secureEnv = getFilteredEnv();
assert.strictEqual(fullEnv.SECRET_KEY, 'secret123');
assert.strictEqual(secureEnv.SECRET_KEY, undefined);
assert.strictEqual(secureEnv.PUBLIC_API_URL, 'https://api.example.com');
assert.strictEqual(secureEnv.NODE_ENV, process.env.NODE_ENV);

console.log('Testing isRouteIgnored...');
import { isRouteIgnored } from '../src/router';
assert.strictEqual(isRouteIgnored('/api/health', ['/api/health']), true);
assert.strictEqual(isRouteIgnored('/admin/users', ['/admin/*']), true);
assert.strictEqual(isRouteIgnored('/public/about', ['/admin/*']), false);

console.log('✅ All TS router path and helper tests passed!');
