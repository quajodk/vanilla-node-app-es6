/**
 * Helper function for various logics
 */

//  Dependencies
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');

// helpers object
const helpers = {};

// creating SHA256 hashing password
helpers.hash = str => {
  if (typeof str == 'string' && str.length > 0) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parsing json string to object without throwing
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (error) {
    return {};
  }
};

helpers.createRandomString = strLength => {
  strLength = typeof strLength == 'number' && strLength > 0 ? strLength : false;

  if (strLength) {
    // possible character to be included
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let str = '';
    for (let i = 1; i <= strLength; i++) {
      // get random characters from the possible character
      const randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );

      // append it to string
      str += randomCharacter;
    }

    return str;
  } else {
    return false;
  }
};

// sending SMS via twilio API
helpers.sendTwilioSms = (phone, msg, callback) => {
  // check for params
  phone =
    typeof phone == 'string' && phone.trim().length == 10
      ? phone.trim()
      : false;
  msg =
    typeof msg == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600
      ? msg.trim()
      : false;

  if (phone && msg) {
    // request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: `+233${phone}`,
      Body: msg
    };

    // stringify the payload
    const payloadString = querystring.stringify(payload);

    // configure the request details
    const requestData = {
      protocols: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payloadString)
      }
    };

    // instantiate the request
    const req = https.request(requestData, res => {
      // get the status code
      const status = res.statusCode;
      if (status == 200 || status == 201) {
        callback(false);
      } else {
        callback(`Status code for the error was ${status}`);
      }
    });

    req.on('error', err => {
      callback(err);
    });

    req.write(payloadString);
    req.end();
  } else {
    callback('Missing input data, or invalid data provided');
  }
};

// export helper module
module.exports = helpers;
