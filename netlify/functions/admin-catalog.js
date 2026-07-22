const adminCatalogHandler = require("../../api/admin-catalog");

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function buildUrl(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const query = params.toString();
  return query ? `${event.path}?${query}` : event.path;
}

exports.handler = async function handler(event) {
  const headers = {};
  const req = {
    method: event.httpMethod,
    url: buildUrl(event),
    headers: normalizeHeaders(event.headers),
    body: event.body || "",
  };
  const res = {
    statusCode: 200,
    setHeader(name, value) {
      headers[name] = String(value);
    },
    end(body = "") {
      this.body = body;
    },
  };

  await adminCatalogHandler(req, res);

  return {
    statusCode: res.statusCode,
    headers,
    body: res.body || "",
  };
};
