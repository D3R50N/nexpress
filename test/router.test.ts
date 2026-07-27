import assert from 'assert';
import path from 'path';
import { fileToRoutePath, findLayoutsForRoute } from '../src/router';
import { builtinHelpers } from '../src/helpers';
import { renderComponent, registerComponents } from '../src/components';

console.log('Testing fileToRoutePath (TypeScript)...');

assert.strictEqual(fileToRoutePath('index.hbs'), '/');
assert.strictEqual(fileToRoutePath('about.hbs'), '/about');
assert.strictEqual(fileToRoutePath('users/index.hbs'), '/users');
assert.strictEqual(fileToRoutePath('users/[id].hbs'), '/users/:id');
assert.strictEqual(fileToRoutePath('blog/[...slug].hbs'), '/blog/*');
assert.strictEqual(fileToRoutePath('api/health.ts'), '/api/health');

console.log('Testing findLayoutsForRoute...');
const exampleHbsDir = path.resolve('./example/handlebars/app');
const layouts = findLayoutsForRoute(path.resolve('./example/handlebars'), exampleHbsDir, 'index.hbs', 'hbs');
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
const exampleComponentsDir = path.resolve('./example/handlebars/components');
registerComponents(exampleComponentsDir);
const compUpper = renderComponent('ProductCard', { product: { name: 'Test', price: 100 } });
const compLower = renderComponent('productcard', { product: { name: 'Test', price: 100 } });
assert.strictEqual(compUpper, compLower);

console.log('✅ All TS router path and helper tests passed!');
