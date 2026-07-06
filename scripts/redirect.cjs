const http = require('http');

const PORT = 5173;
const TARGET_PORT = 5174;

const server = http.createServer((req, res) => {
  // Extract host without port
  const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
  const redirectUrl = `https://${host}:${TARGET_PORT}${req.url}`;
  
  res.writeHead(301, { "Location": redirectUrl });
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP Redirector] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[HTTP Redirector] Redirecting all HTTP traffic to HTTPS on port ${TARGET_PORT}`);
});
