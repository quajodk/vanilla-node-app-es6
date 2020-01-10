/**
 * This is the handlers for the requests
 */

//  Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// handlers
const handlers = {};

// user handler
handlers.users = (data, callback) => {
  // accepted methods
  const acceptedMethods = ['post', 'get', 'put', 'delete'];

  if (acceptedMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// users sub methods objects
handlers._users = {};

// users - post
// required data: firstName, lastName, phone, password, tosAgreement
// optional data: none
handlers._users.post = (data, callback) => {
  // get data from the payload
  let {firstName, lastName, phone, password, tosAgreement} = data.payload;

  // check if data if sent
  firstName =
    typeof firstName == 'string' && firstName.trim().length > 0
      ? firstName.trim()
      : false;
  lastName =
    typeof lastName == 'string' && lastName.trim().length > 0
      ? lastName.trim()
      : false;
  phone =
    typeof phone == 'string' && phone.trim().length == 10
      ? phone.trim()
      : false;
  password =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;
  tosAgreement =
    typeof tosAgreement == 'boolean' && tosAgreement == true ? true : false;

  if ((firstName, lastName, phone, password, tosAgreement)) {
    // check if user does not already exist
    _data.read('users', phone, (err, data) => {
      if (err) {
        // hash the password
        const hashPassword = helpers.hash(password);
        if (hashPassword) {
          // user object
          const userObj = {
            firstName,
            lastName,
            phone,
            hashPassword,
            tosAgreement
          };

          // create user
          _data.create('users', phone, userObj, err => {
            if (!err) {
              callback(200, {message: 'User created successfully'});
            } else {
              console.log(err);
              callback(500, {Error: 'Could not create user'});
            }
          });
        } else {
          callback(500, {Error: 'Error occurred creating user'});
        }
      } else {
        callback(400, {Error: 'User already exist'});
      }
    });
  } else {
    callback(400, {Error: 'Missing required field'});
  }
};

// users - get
// required data: phone
// optional data: none
handlers._users.get = (data, callback) => {
  // get phone query string
  let {phone} = data.queryStringObject;
  // check for required data
  phone =
    typeof phone == 'string' && phone.trim().length == 10
      ? phone.trim()
      : false;

  if (phone) {
    // get token from headers
    let {token} = data.headers;

    token = typeof token == 'string' ? token : false;

    // verify the given token for the phone number
    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // look for user
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            // remove password from returning data
            delete data.hashPassword;
            callback(200, data);
          } else {
            callback(404, {Error: 'User not found'});
          }
        });
      } else {
        callback(403, {Error: 'You are not authorized for this operation'});
      }
    });
  } else {
    callback(400, {Error: 'Missing required user'});
  }
};

// users - put
// required field: phone
// optional data: firstName, lstName, password (at least one)
handlers._users.put = (data, callback) => {
  // get phone query string
  let {phone, firstName, lastName, password} = data.payload;
  // check for required data
  phone =
    typeof phone == 'string' && phone.trim().length == 10
      ? phone.trim()
      : false;

  // check for optional data
  firstName =
    typeof firstName == 'string' && firstName.trim().length > 0
      ? firstName.trim()
      : false;
  lastName =
    typeof lastName == 'string' && lastName.trim().length > 0
      ? lastName.trim()
      : false;
  password =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;

  if (phone) {
    // get token from headers
    let {token} = data.headers;

    token = typeof token == 'string' ? token : false;

    // verify the given token for the phone number
    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // if nothing is sent to be updated
        if (firstName || lastName || password) {
          // check if user exist
          _data.read('users', phone, (err, user) => {
            if (!err && user) {
              // update the necessary fields
              if (firstName) {
                user.firstName = firstName;
              }
              if (lastName) {
                user.firstName = lastName;
              }
              if (password) {
                user.hashPassword = helpers.hash(password);
              }
              // save the user
              _data.update('users', phone, user, err => {
                if (!err) {
                  callback(200, {message: 'User successfully updated'});
                } else {
                  console.log(err);
                  callback(500, {Error: 'Could not update user'});
                }
              });
            } else {
              callback(404, {Error: 'The user does not exist'});
            }
          });
        } else {
          callback(400, {message: 'Nothing was updated'});
        }
      } else {
        callback(403, {Error: 'You are not authorized to do this operation'});
      }
    });
  } else {
    callback(400, {Error: 'Missing require filed'});
  }
};

// users - delete
// required data: phone
// optional data: none
handlers._users.delete = (data, callback) => {
  // get data from query string
  let {phone} = data.queryStringObject;

  // check for required data
  phone =
    typeof phone == 'string' && phone.trim().length == 10
      ? phone.trim()
      : false;

  if (phone) {
    // get token from headers
    let {token} = data.headers;

    token = typeof token == 'string' ? token : false;

    // verify the given token for the phone number
    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // check if user exist
        _data.read('users', phone, (err, user) => {
          if (!err && user) {
            _data.delete('users', phone, err => {
              if (!err) {
                const userChecks =
                  typeof user.checks == 'object' && user.checks instanceof Array
                    ? user.checks
                    : [];
                const checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  let checksDelete = 0;
                  let deleteError = false;
                  // loop through the user checks
                  userChecks.forEach(checkId => {
                    _data.delete('checks', checkId, err => {
                      if (err) {
                        deleteError = true;
                      }
                      checksDelete++;
                      if (checksToDelete == checksDelete) {
                        if (!deleteError) {
                          callback(200, {
                            message:
                              'User and all related data deleted successfully'
                          });
                        } else {
                          callback(500, {Error: 'Could not delete check data'});
                        }
                      }
                    });
                  });
                } else {
                  callback(200, {message: 'User successfully deleted'});
                }
              } else {
                callback(500, {Error: 'Could not delete user'});
              }
            });
          } else {
            callback(404, {message: 'User not found'});
          }
        });
      } else {
        callback(403, {Error: 'You are not authorized to do this operation'});
      }
    });
  } else {
    callback(400, {Error: 'No data was sent'});
  }
};

// tokens handler
handlers.tokens = (data, callback) => {
  // accepted methods
  const acceptedMethods = ['post', 'get', 'put', 'delete'];

  if (acceptedMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// token sub methods objects
handlers._tokens = {};

// tokens - post
// required data: phone, password
// optional data: none
handlers._tokens.post = (data, callback) => {
  let {phone, password} = data.payload;

  // check for required data
  phone =
    typeof phone == 'string' && phone.trim().length == 10
      ? phone.trim()
      : false;
  password =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;

  if (phone && password) {
    // lookup the user
    _data.read('users', phone, (err, user) => {
      if (!err && user) {
        // hash the password
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == user.hashPassword) {
          // create a token for the user
          const tokenId = helpers.createRandomString(20);
          const expire = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expire
          };

          // save token object
          _data.create('tokens', tokenId, tokenObject, err => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {Error: 'Could not create a token'});
            }
          });
        } else {
          callback(400, {Error: 'Invalid password'});
        }
      } else {
        callback(404, {Error: 'User does not exist'});
      }
    });
  } else {
    callback(400, {Error: 'Missing required filed(s)'});
  }
};

// tokens - get
// required data: id
// optional data: none
handlers._tokens.get = (data, callback) => {
  let {id} = data.queryStringObject;
  // check for required data
  id = typeof id == 'string' && id.trim().length == 20 ? id.trim() : false;

  if (id) {
    // look for user
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        callback(200, data);
      } else {
        callback(404, {Error: 'User not found'});
      }
    });
  } else {
    callback(400, {Error: 'Missing required user'});
  }
};

// tokens - put
// required data: id, extend
// optional data: none
handlers._tokens.put = (data, callback) => {
  let {id, extend} = data.payload;
  // check for required data
  id = typeof id == 'string' && id.trim().length == 20 ? id.trim() : false;
  extend = typeof extend == 'boolean' && extend == true ? true : false;

  if (id && extend) {
    // lookup token
    _data.read('tokens', id, (err, token) => {
      if (!err && token) {
        // check if token has not expired
        if (token.expire > Date.now()) {
          // set expiration 1hour from now
          token.expire = Date.now() + 1000 * 60 * 60;

          // save new token expiration
          _data.update('tokens', id, token, err => {
            if (!err) {
              callback(200, {message: 'Token have been updated successfully'});
            } else {
              console.log(err);
              callback(500, {Error: 'Could not update token expiration'});
            }
          });
        } else {
          callback(400, {
            Error: 'This token can not be extended it has already expired'
          });
        }
      } else {
        callback(404, {Error: 'Not found'});
      }
    });
  } else {
    callback(400, {Error: 'Invalid data send'});
  }
};

// tokens - delete
// required data: id
// optional data: none
handlers._tokens.delete = (data, callback) => {
  // get data from query string
  let {id} = data.queryStringObject;

  // check for required data
  id = typeof id == 'string' && id.trim().length == 20 ? id.trim() : false;

  if (id) {
    // check if user exist
    _data.read('tokens', id, (err, user) => {
      if (!err && user) {
        _data.delete('tokens', id, err => {
          if (!err) {
            callback(200, {message: 'Token successfully deleted'});
          } else {
            callback(500, {Error: 'Could not delete token'});
          }
        });
      } else {
        callback(404, {message: 'Token not found'});
      }
    });
  } else {
    callback(400, {Error: 'No data was sent'});
  }
};

handlers._tokens.verifyToken = (id, phone, callback) => {
  // look up the token
  _data.read('tokens', id, (err, token) => {
    if (!err && token) {
      // check if the token is for the phone, and it has not expired
      if (token.phone == phone && token.expire > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// checks handler
handlers.checks = (data, callback) => {
  // accepted methods
  const acceptedMethods = ['post', 'get', 'put', 'delete'];

  if (acceptedMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// checks objects
handlers._checks = {};

// check - post
// required data: protocol, url, timeoutSeconds, method, successCode
// optional data: none
handlers._checks.post = (data, callback) => {
  let {protocol, url, method, timeoutSeconds, successCode} = data.payload;

  // check for required data
  protocol =
    typeof protocol == 'string' && ['https', 'http'].indexOf(protocol) > -1
      ? protocol
      : false;
  url = typeof url == 'string' && url.trim().length > 0 ? url.trim() : false;
  method =
    typeof method == 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(method) > -1
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

  if (protocol && url && successCode && timeoutSeconds && method) {
    // get the token from the headers
    let {token} = data.headers;

    // check the token
    token = typeof token == 'string' ? token : false;

    // lookup the user by the token
    _data.read('tokens', token, (err, token) => {
      if (!err && token) {
        // get user phone
        const userPhone = token.phone;

        // lookup the user with the user phone
        _data.read('users', userPhone, (err, user) => {
          if (!err && user) {
            const userChecks =
              typeof user.checks == 'object' && user.checks instanceof Array
                ? user.checks
                : [];

            // check user checks with max checks
            if (userChecks.length < config.maxChecks) {
              // create random string for the check
              const checkId = helpers.createRandomString(20);

              // check object
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                method,
                url,
                successCode,
                timeoutSeconds
              };

              // save the check
              _data.create('checks', checkId, checkObject, err => {
                if (!err) {
                  // add the check id to the user object
                  user.checks = userChecks;
                  user.checks.push(checkId);

                  // update the user object
                  _data.update('users', userPhone, user, err => {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: 'Could not update user with the new check'
                      });
                    }
                  });
                } else {
                  callback(500, {Error: 'Could not create check'});
                }
              });
            } else {
              callback(400, {
                Error: `You have done the maximum number of checks (${config.maxChecks})`
              });
            }
          } else {
            callback(403, {
              Error: 'You are not authorized to do this operation'
            });
          }
        });
      } else {
        callback(403, {Error: 'Invalid token, not allow to do this operation'});
      }
    });
  } else {
    callback(400, {Error: 'Missing required data, or input are invalid'});
  }
};

// check - get
// require data: id
// optional data: none
handlers._checks.get = (data, callback) => {
  let {id} = data.queryStringObject;
  // check for required data
  id = typeof id == 'string' && id.trim().length == 20 ? id.trim() : false;

  if (id) {
    // look for user
    _data.read('checks', id, (err, checkData) => {
      if (!err && data) {
        // get token from headers
        let {token} = data.headers;

        token = typeof token == 'string' ? token : false;

        // verify the given token for the phone number
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          tokenIsValid => {
            if (tokenIsValid) {
              // return the check data
              callback(200, checkData);
            } else {
              callback(403, {
                Error: 'You are not authorized for this operation'
              });
            }
          }
        );
      } else {
        callback(404, {Error: 'Check was not found'});
      }
    });
  } else {
    callback(400, {Error: 'Missing required data'});
  }
};

// check - put
// require data: id
// optional data: protocol, url, successCodes, timeoutSeconds, method
handlers._checks.put = (data, callback) => {
  let {id, protocol, url, method, successCode, timeoutSeconds} = data.payload;
  // check for required data
  id = typeof id == 'string' && id.trim().length == 20 ? id.trim() : false;

  // check for optional data
  protocol =
    typeof protocol == 'string' && ['https', 'http'].indexOf(protocol) > -1
      ? protocol
      : false;
  url = typeof url == 'string' && url.trim().length > 0 ? url.trim() : false;
  method =
    typeof method == 'string' &&
    ['post', 'get', 'put', 'delete'].indexOf(method) > -1
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

  if (id) {
    // check if any of the optional data is sent
    if (protocol || url || method || successCode || timeoutSeconds) {
      // look up the check
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          let {token} = data.headers;

          token = typeof token == 'string' ? token : false;

          // verify the given token for the phone number
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            tokenIsValid => {
              if (tokenIsValid) {
                // update where necessary
                if (protocol) {
                  checkData.protocol = protocol;
                }
                if (url) {
                  checkData.url = url;
                }
                if (method) {
                  checkData.method = method;
                }
                if (timeoutSeconds) {
                  checkData.timeoutSeconds = timeoutSeconds;
                }
                if (successCode) {
                  checkData.successCode = successCode;
                }

                // save the update
                _data.update('checks', id, checkData, err => {
                  if (!err) {
                    callback(200, {message: 'Check update successfully'});
                  } else {
                    callback(500, {Error: 'Could not update check'});
                  }
                });
              } else {
                callback(403, {
                  Error: 'You are not authorized for this operation'
                });
              }
            }
          );
        } else {
          callback(404, {
            Error: 'Check with the specified user does not exist'
          });
        }
      });
    } else {
      callback(400, {Error: 'No data was sent to be updated'});
    }
  } else {
    callback(400, {Error: 'Missing required data'});
  }
};

// check - delete
// required data: id
// optional data: none
handlers._checks.delete = (data, callback) => {
  // get data from query string
  let {id} = data.queryStringObject;

  // check for required data
  id = typeof id == 'string' && id.trim().length == 20 ? id.trim() : false;

  if (id) {
    // look up the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // get token from headers
        let {token} = data.headers;

        token = typeof token == 'string' ? token : false;

        // verify the token, check if user logged in
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          tokenIsValid => {
            if (tokenIsValid) {
              // delete the check data
              _data.delete('checks', id, err => {
                if (!err) {
                  // look the user data
                  _data.read('users', checkData.userPhone, (err, user) => {
                    if (!err && user) {
                      const userChecks =
                        typeof user.checks == 'object' &&
                        user.checks instanceof Array
                          ? user.checks
                          : [];

                      // remove the deleted check from the list of user checks
                      const checkPosition = userChecks.indexOf(id);
                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1);
                        // re-save user data
                        _data.update(
                          'users',
                          checkData.userPhone,
                          user,
                          err => {
                            if (!err) {
                              callback(200, {
                                message: 'User data updated successfully'
                              });
                            } else {
                              callback(500, {
                                Error: 'Could not update the user data'
                              });
                            }
                          }
                        );
                      }
                    } else {
                      callback(404, {Error: 'Could not found user data'});
                    }
                  });
                } else {
                  callback(500, {Error: 'Could not delete check data'});
                }
              });
            } else {
              callback(403, {Error: 'You are not authorized to do operation'});
            }
          }
        );
      } else {
        callback(404, {Error: 'Could not find the specified check'});
      }
    });
  } else {
    callback(400, {Error: 'No data was sent'});
  }
};

// ping handler
handlers.ping = (data, callback) => {
  callback(200, {message: 'app is working'});
};

// notFound handler
handlers.notFound = (data, callback) => {
  callback(404, {name: 'page not found'});
};

// export handlers module
module.exports = handlers;
