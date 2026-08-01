import type { Request, Response } from "express";
import { getInjection } from "./injections";

const clients = new Set<Response>();

export function handleLiveReloadRoute(req: Request, res: Response) {
  if (req.method === "HEAD") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end();
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("data: connected\n\n");
  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
}

export function notifyLiveReload() {
  for (const client of clients) {
    try {
      client.write("data: reload\n\n");
    } catch (e) {
      clients.delete(client);
    }
  }
}

export function getLiveReloadScript(): string {
  return getInjection("liveReload.html");
}

export const LIVE_RELOAD_SCRIPT = getLiveReloadScript();

export function injectLiveReloadScript(html: string): string {
  if (html.includes("__nxpress_live_reload__")) return html;
  const script = getLiveReloadScript();
  if (html.includes("</body>")) {
    return html.replace("</body>", `\n${script}\n</body>`);
  }
  return html + script;
}

