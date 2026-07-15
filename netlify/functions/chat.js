const chatHandler = require("../../api/chat");

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
    body: event.body || "",
    socket: {
      remoteAddress:
        event.headers?.["x-nf-client-connection-ip"] ||
        event.headers?.["client-ip"] ||
        "unknown",
    },
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

  await chatHandler(req, res);

  return {
    statusCode: res.statusCode,
    headers,
    body: res.body || "",
  };
};
