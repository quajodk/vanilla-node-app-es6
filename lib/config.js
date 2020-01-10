/**
 * Create and export config variables
 */

//  object for all the environment
const env = {};

// development (default) environment
env.development = {
  PORT: 3000,
  env: 'development',
  hashingSecret: '',
  maxChecks: 5,
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: ''
  }
};

// production environment
env.production = {
  PORT: 5000,
  env: 'production',
  hashingSecret: '',
  maxChecks: 5,
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: ''
  }
};

// determine which environment to export
const currentEvn =
  typeof process.env.NODE_ENV == 'string'
    ? process.env.NODE_ENV.toLowerCase()
    : '';

// check the current environment, if none default to development
const exportEnv =
  typeof env[currentEvn] == 'object' ? env[currentEvn] : env.development;

// export env
module.exports = exportEnv;
