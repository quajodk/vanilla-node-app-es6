/**
 * Primary file for the API
 */

//  Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// app object
const app = {};

// app init
app.init = () => {
  // start server
  server.init();

  // run the workers
  workers.init();
};

// start app
app.init();

// export app module
module.exports = app;
