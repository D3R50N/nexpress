import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { logger } from './logger';

export interface TailwindOptions {
  enabled?: boolean;
  input?: string;
  output?: string;
}

/**
 * Calculates the public output path and public URL for Tailwind CSS inside publicDir.
 */
export function getTailwindOutputInfo(
  rootDir: string,
  publicDir?: string,
  options: TailwindOptions = {}
): { outputCss: string; cssPublicUrl: string } {
  const resolvedPublicDir = publicDir
    ? path.resolve(rootDir, publicDir)
    : path.join(rootDir, 'public');

  const rawOutput = options.output || 'tailwind.css';
  const relPath = path.isAbsolute(rawOutput)
    ? path.relative(resolvedPublicDir, rawOutput)
    : rawOutput;

  const outputCss = path.resolve(resolvedPublicDir, relPath);
  const cleanRelUrl = relPath.replace(/\\/g, '/').replace(/^\//, '');
  const cssPublicUrl = `/${cleanRelUrl}`;

  return { outputCss, cssPublicUrl };
}

/**
 * Compiles Tailwind CSS inside publicDir once on server startup/restart.
 */
export function compileTailwindCss(
  rootDir: string,
  publicDir?: string,
  options: TailwindOptions = {}
): string {
  const inputCss = options.input
    ? path.resolve(rootDir, options.input)
    : path.join(rootDir, 'app.css');

  const { outputCss, cssPublicUrl } = getTailwindOutputInfo(rootDir, publicDir, options);
  const outputDir = path.dirname(outputCss);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create default input CSS if it does not exist
  if (!fs.existsSync(inputCss)) {
    const defaultCssContent = `@import "tailwindcss";\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
    fs.writeFileSync(inputCss, defaultCssContent, 'utf8');
  }

  try {
    const compileCmd = `npx @tailwindcss/cli -i "${inputCss}" -o "${outputCss}"`;
    execSync(compileCmd, { cwd: rootDir, stdio: 'ignore' });
  } catch (err: any) {
    logger.warn('Tailwind CSS compilation notice:', err?.message || err);
  }

  return cssPublicUrl;
}

/**
 * Automatically injects <link rel="stylesheet" href="..."> before </head> if missing.
 */
export function injectTailwindCss(
  html: string,
  cssPublicUrl: string = '/tailwind.css'
): string {
  if (html.includes(cssPublicUrl)) {
    return html;
  }

  const linkTag = `<link rel="stylesheet" href="${cssPublicUrl}">\n`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `  ${linkTag}</head>`);
  }

  return linkTag + html;
}
