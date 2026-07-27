import http from 'http';
import assert from 'assert';
import path from 'path';
import { startServer } from '../src/server';

const PORT_HBS = 4567;
const PORT_EJS = 4568;

const hbsDir = path.join(__dirname, '../example/handlebars');
const ejsDir = path.join(__dirname, '../example/ejs');

const hbsServer = startServer({
  port: PORT_HBS,
  rootDir: hbsDir,
  tailwind: false,
  globals: {
    siteName: 'Nexpress Store',
    appName: 'Nexpress App',
    siteVersion: '2.0',
    currency: '€',
  },
});

const ejsServer = startServer({
  port: PORT_EJS,
  rootDir: ejsDir,
  engine: 'ejs',
  tailwind: false,
  globals: {
    siteName: 'Nexpress EJS Store',
    author: 'Nexpress Team',
  },
});

function fetchUrl(port: number, urlPath: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${urlPath}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 500, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  try {
    console.log('Running TS integration tests for HBS & EJS...');

    // 1. Test Handlebars
    const homeHbs = await fetchUrl(PORT_HBS, '/');
    assert.strictEqual(homeHbs.status, 200);
    assert.ok(homeHbs.body.includes('NEXPRESS STORE'));
    console.log('✅ HBS Homepage test passed!');

    // 2. Test EJS
    const homeEjs = await fetchUrl(PORT_EJS, '/');
    assert.strictEqual(homeEjs.status, 200);
    assert.ok(homeEjs.body.includes('NEXPRESS EJS STORE'));
    console.log('✅ EJS Homepage & Component test passed!');

    const prodEjs = await fetchUrl(PORT_EJS, '/products');
    assert.strictEqual(prodEjs.status, 200);
    assert.ok(prodEjs.body.includes('Catalogue de Produits (EJS)'));
    console.log('✅ EJS Products catalog test passed!');

    const prodDetailEjs = await fetchUrl(PORT_EJS, '/products/1');
    assert.strictEqual(prodDetailEjs.status, 200);
    assert.ok(prodDetailEjs.body.includes('MacBook Pro M3'));
    console.log('✅ EJS Product detail test passed!');

    // 3. Test invalid engine error
    assert.throws(() => {
      startServer({ port: 9999, engine: 'pug' as any });
    }, /Unsupported template engine/);
    console.log('✅ Unsupported engine validation test passed!');

    console.log('\n🎉 ALL HBS & EJS INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Integration test failed:', err);
    process.exitCode = 1;
  } finally {
    hbsServer.close();
    ejsServer.close();
  }
}

setTimeout(runTests, 500);
