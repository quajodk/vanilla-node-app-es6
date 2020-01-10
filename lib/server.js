/**
 * Server for the API
 */

//  Dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const util = require('util');
const debug = util.debuglog('server');

// server object
const server = {};

// The server will respond to all request
server.httpServer = http.createServer((req, res) => {
  // get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  //get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // get method
  const method = req.method.toLowerCase();

  // get query string as objects
  const queryStringObject = parsedUrl.query;

  // get headers as objects
  const headers = req.headers;

  // router
  const router = {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks
  };

  // get payload. if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', data => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // select handler
    const selectHandler =
      typeof router[trimmedPath] !== 'undefined'
        ? router[trimmedPath]
        : handlers.notFound;

    // data to be send
    const data = {
      trimmedPath,
      method,
      headers,
      queryStringObject,
      payload: helpers.parseJsonToObject(buffer)
    };

    // route the request to the handler
    selectHandler(data, (statusCode, payload) => {
      // use the status code called back by the handle, or default to 200
      statusCode = typeof statusCode == 'number' ? statusCode : 200;

      // user the payload called back by the handle, or default to {}
      payload = typeof payload == 'object' ? payload : {};

      // convert payload to a string
      const payloadString = JSON.stringify(payload);

      // return a response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // log the request
      debug(`Returning this response: ${statusCode} ${payloadString}`);
    });
  });
});

// start server
server.init = () => {
  // server listening on a port
  const PORT = config.PORT;

  server.httpServer.listen(PORT, () =>
    console.log(
      '\x1b[35m%s\x1b[0m',
      `server listening on port ${PORT} in ${config.env} mode`
    )
  );
};

module.exports = server;
