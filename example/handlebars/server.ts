import path from 'path';
import { startServer } from '../../src/server';

const PORT = 3000;

startServer({
  port: PORT,
  rootDir: __dirname,
  globals: {
    siteName: 'Nexpress Store',
    author: 'Nexpress Team',
    version: '1.0.0',
    currency: '€',
  },
});
