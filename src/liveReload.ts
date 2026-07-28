import type { Request, Response } from "express";

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

export const LIVE_RELOAD_SCRIPT = `<script id="__nxpress_live_reload__">
(function() {
  if (window.__nxpress_sse__) return;
  window.__nxpress_sse__ = true;

  function connect() {
    var es = new EventSource('/nxpress/live-reload');
    var isConnected = false;

    es.onopen = function() {
      isConnected = true;
    };

    es.onmessage = function(e) {
      if (e.data === 'reload') {
        location.reload();
      }
    };

    es.onerror = function() {
      es.close();
      if (isConnected) {
        var timer = setInterval(function() {
          fetch('/nxpress/live-reload', { method: 'HEAD' })
            .then(function(res) {
              if (res.ok || res.status < 400) {
                clearInterval(timer);
                location.reload();
              }
            })
            .catch(function() {});
        }, 250);
      } else {
        setTimeout(connect, 1000);
      }
    };
  }

  connect();
})();
</script>`;

export function injectLiveReloadScript(html: string): string {
  if (html.includes("__nxpress_live_reload__")) return html;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${LIVE_RELOAD_SCRIPT}\n</body>`);
  }
  return html + LIVE_RELOAD_SCRIPT;
}
