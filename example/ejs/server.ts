import path from 'path';
import { serve } from '../../src/server';

const PORT = 3001;

serve({
  port: PORT,
  
  rootDir: __dirname,
  engine: 'ejs',
  globals: {
    siteName: 'Nexpress EJS Store',
    author: 'Nexpress Team',
    version: '1.0.0',
    currency: '€',
  },
});
