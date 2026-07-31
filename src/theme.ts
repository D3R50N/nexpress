import { getInjection } from "./injections";

export function getThemeScript(): string {
  return getInjection("theme.html");
}

export function injectThemeScript(html: string): string {
  if (!html || html.includes("__nxpress_theme__")) return html;
  const script = getThemeScript();
  if (!script) return html;

  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>\n  ${script}`);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n  ${script}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}\n  ${script}`);
  }
  return `${script}\n${html}`;
}
