const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const chatHandler = require("./api/chat");
const productsHandler = require("./api/products");
const catalogHandler = require("./api/catalog");
const adminCatalogHandler = require("./api/admin-catalog");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function routeApi(req, res) {
  if (req.url.startsWith("/api/chat")) {
    const startedAt = Date.now();
    const originalEnd = res.end;
    res.end = function logApiResponse(...args) {
      console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - startedAt}ms`);
      return originalEnd.apply(this, args);
    };

    req.body = await readRequestBody(req);
    return chatHandler(req, res);
  }

  if (req.url.startsWith("/api/products")) {
    const startedAt = Date.now();
    const originalEnd = res.end;
    res.end = function logApiResponse(...args) {
      console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - startedAt}ms`);
      return originalEnd.apply(this, args);
    };

    return productsHandler(req, res);
  }

  if (req.url.startsWith("/api/admin/catalog")) {
    const startedAt = Date.now();
    const originalEnd = res.end;
    res.end = function logApiResponse(...args) {
      console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - startedAt}ms`);
      return originalEnd.apply(this, args);
    };

    req.body = await readRequestBody(req);
    return adminCatalogHandler(req, res);
  }

  if (req.url.startsWith("/api/catalog")) {
    const startedAt = Date.now();
    const originalEnd = res.end;
    res.end = function logApiResponse(...args) {
      console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - startedAt}ms`);
      return originalEnd.apply(this, args);
    };

    return catalogHandler(req, res);
  }

  return send(res, 404, JSON.stringify({ error: "not_found" }), "application/json; charset=utf-8");
}

function safeFilePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, normalizedPath === "/" ? "index.html" : normalizedPath);

  if (!filePath.startsWith(ROOT)) return null;
  return filePath;
}

function routeStatic(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let filePath = safeFilePath(parsedUrl.pathname);

  if (!filePath) return send(res, 403, "Forbidden");
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT, "404.html");
    if (!fs.existsSync(filePath)) return send(res, 404, "Not found");
    res.statusCode = 404;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await routeApi(req, res);
      return;
    }

    routeStatic(req, res);
  } catch (error) {
    send(res, 500, JSON.stringify({ error: "dev_server_error" }), "application/json; charset=utf-8");
  }
});

server.listen(PORT, () => {
  console.log(`Korei dev server running at http://localhost:${PORT}`);
  console.log(`Groq API key: ${process.env.GROQ_API_KEY ? "loaded" : "missing"}`);
});
