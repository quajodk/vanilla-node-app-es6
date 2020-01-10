/**
 * Workers file
 */

//  Dependencies
var path = require('path');
var fs = require('fs');
const http = require('http');
const https = require('https');
const nodeUrl = require('url');
const helpers = require('./helpers');
const _data = require('./data');
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');

// workers object
const workers = {};

// notify user of status change
workers.notifyUserStatusChange = newData => {
  const {url, userPhone, protocol, method, state} = newData;

  const msg = `Alert: Your check for ${method.toUpperCase()}: ${protocol}://${url} is currently ${state}`;

  // send the sms
  helpers.sendTwilioSms(userPhone, msg, err => {
    if (!err) {
      debug('User was notified');
    } else {
      debug('Error notifying user');
    }
  });
};

// log check data to a file
workers.log = (data, checkOutcome, state, shouldNotifyUser, timeOfCheck) => {
  // log data
  const logData = {
    check: data,
    outcome: checkOutcome,
    state,
    alert: shouldNotifyUser,
    time: timeOfCheck
  };

  const logString = JSON.stringify(logData);

  const logFileName = data.id;

  _logs.append(logFileName, logString, err => {
    if (!err) {
      debug('Logging file was successful');
    } else {
      debug('Error logging to fie');
    }
  });
};

// outcome of checks
workers.processCheckOutcome = (data, checkOutcome) => {
  // determine if check is up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    data.successCode.indexOf(checkOutcome.responseCode) > -1
      ? 'up'
      : 'down';

  // check if we have to notify user
  const shouldNotifyUser =
    data.lastChecked && data.state !== state ? true : false;

  // logging data to files
  const timeOfCheck = Date.now();
  workers.log(data, checkOutcome, state, shouldNotifyUser, timeOfCheck);

  // update the check date
  const newCheck = data;
  newCheck.state = state;
  newCheck.lastChecked = timeOfCheck;

  // save the check data
  _data.update('checks', newCheck.id, newCheck, err => {
    if (!err) {
      // send notification if needed
      if (shouldNotifyUser) {
        workers.notifyUserStatusChange(newCheck);
      } else {
        debug("Check outcome has not changed, don't notify user");
      }
    } else {
      debug('Error updating the check data');
    }
  });
};

// perform checks
workers.performCheck = data => {
  // outcome object
  const checkOutcome = {
    error: false,
    responseCode: false
  };

  let outcomeSent = false;

  const {protocol, url, method, timeoutSeconds} = data;

  // parse the hostname and the path from the check data
  const parsedUrl = nodeUrl.parse(`${protocol}://${url}`, true);
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path;

  // request object
  const requestData = {
    protocol: `${protocol}:`,
    hostName,
    method: method.toUpperCase(),
    path,
    timeout: timeoutSeconds * 1000
  };

  const _httpType = protocol == 'http' ? http : https;
  const req = _httpType.request(requestData, res => {
    const status = res.statusCode;

    // update the check outcome and pass the data along
    checkOutcome.responseCode = status;

    if (!outcomeSent) {
      workers.processCheckOutcome(data, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind to the error event
  req.on('error', err => {
    // update the check outcome and pass along the data
    checkOutcome.error = {
      error: true,
      value: err
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(data, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind to the timeout event
  req.on('timeout', err => {
    // update the check outcome and pass along the data
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(data, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
};

// validate check data
workers.validateCheckData = data => {
  data = typeof data == 'object' && data !== null ? data : {};

  // get data from the object
  let {
    id,
    protocol,
    url,
    method,
    userPhone,
    successCode,
    timeoutSeconds
  } = data;

  id = typeof id == 'string' && id.trim().length == 20 ? id.trim() : false;
  userPhone =
    typeof userPhone == 'string' && userPhone.trim().length == 10
      ? userPhone.trim()
      : false;
  url = typeof url == 'string' && url.trim().length > 0 ? url.trim() : false;
  protocol =
    typeof protocol == 'string' && ['https', 'https'].indexOf(protocol) > -1
      ? protocol
      : false;
  method =
    typeof method == 'string' &&
    ['post', 'get', 'delete', 'put'].indexOf(method) > -1
      ? method
      : false;
  successCode =
    typeof successCode == 'object' &&
    successCode instanceof Array &&
    successCode.length > 0
      ? successCode
      : false;
  timeoutSeconds =
    typeof timeoutSeconds == 'number' &&
    timeoutSeconds % 1 === 0 &&
    timeoutSeconds >= 1 &&
    timeoutSeconds <= 5
      ? timeoutSeconds
      : false;

  // set new keys that has not been set yet
  data.state =
    typeof data.state == 'string' && ['up', 'down'].indexOf(data.state) > -1
      ? data.state
      : 'down';
  data.lastChecked =
    typeof data.lastChecked == 'number' && data.lastChecked > 0
      ? data.lastChecked
      : false;

  // if all passed
  if ({...data}) {
    workers.performCheck(data);
  } else {
    debug('Error: invalid checked data');
  }
};

// execute all checks
workers.gatherAllCheckers = () => {
  // get all checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach(check => {
        _data.read('checks', check, (err, checkData) => {
          if (!err && checkData) {
            // pass it to the check validator
            workers.validateCheckData(checkData);
          } else {
            debug('Error: Could not read the check data');
          }
        });
      });
    } else {
      debug('Error: Could not read any data from the checks directory ' + err);
    }
  });
};

// workers loop
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllCheckers();
  }, 1000 * 60);
};

// compress the log files
workers.compressFile = () => {
  // list all log files in the log directory
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach(log => {
        // compress the log file to different format
        const logId = log.replace('.log', '');
        // new log name
        const newLogName = `${logId}-${Date.now()}`;

        _logs.compress(logId, newLogName, err => {
          if (!err) {
            // truncate the file
            _logs.truncate(logId, err => {
              if (!err) {
                debug('Log file successfully truncated');
              } else {
                debug('Could not truncate the log file');
              }
            });
          } else {
            debug(err);
          }
        });
      });
    } else {
      debug('Could not find logs to compress');
    }
  });
};
// repeat the compression for every 24hours
workers.compressionLoop = () => {
  setInterval(() => {
    workers.compressFile();
  }, 1000 * 60 * 60 * 24);
};

// workers init
workers.init = () => {
  // log worker started
  console.log('\x1b[36m%s\x1b[0m', 'Background workers started');
  // execute all checks
  workers.gatherAllCheckers();

  // workers loop
  workers.loop();

  // compress the log file
  workers.compressFile();

  // loop the compression for every 24hours
  workers.compressionLoop();
};

// export workers module
module.exports = workers;
