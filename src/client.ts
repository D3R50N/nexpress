import { getInjection } from "./injections";

export function getClientScript(): string {
  return getInjection("client.html");
}

export function injectClientScript(html: string): string {
  if (!html || html.includes("__nxpress_client__")) return html;
  const script = getClientScript();
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
