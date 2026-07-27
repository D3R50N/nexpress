import path from 'path';
import { serve } from '../../src/server';

const PORT = 3000;

serve({
  port: PORT,
  rootDir: __dirname,
  globals: {
    siteName: 'Nexpress Store',
    author: 'Nexpress Team',
    version: '1.0.0',
    currency: '€',
  },
});
