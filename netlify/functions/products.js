const productsHandler = require("../../api/products");

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

exports.handler = async function handler(event) {
  const headers = {};
  const req = {
    method: event.httpMethod,
    headers: normalizeHeaders(event.headers),
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

  await productsHandler(req, res);

  return {
    statusCode: res.statusCode,
    headers,
    body: res.body || "",
  };
};
