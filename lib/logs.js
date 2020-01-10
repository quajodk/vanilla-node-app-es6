/**
 * Library for storing and rotating log
 */

//  Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// lib object
const lib = {};

// base directory for storing logs
lib.baseDir = path.join(__dirname, '/../.logs/');

// append logs to a file
lib.append = (file, str, callback) => {
  // open file to append new data
  fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, `${str}\n`, err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              callback(false);
            } else {
              callback('Error: Could not close file');
            }
          });
        }
      });
    } else {
      callback('Could not open file');
    }
  });
};

// list all log files
lib.list = (includeCompressedFiles, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileName = [];
      data.forEach(file => {
        if (file.indexOf('.log') > -1) {
          trimmedFileName.push(file.replace('.log', ''));
        }

        // add already zip files if user indicate true
        if (file.indexOf('.gz.b64') && includeCompressedFiles) {
          trimmedFileName.push(file.replace('.gz.b64', ''));
        }
      });
      callback(false, trimmedFileName);
    } else {
      callback('Could not get any files');
    }
  });
};

// compress log file into gz.b64 file
lib.compress = (logId, newFile, callback) => {
  const source = `${logId}.log`;
  const destFile = `${newFile}.gz.b64`;

  // read the source file
  fs.readFile(`${lib.baseDir}${source}`, 'utf8', (err, fileData) => {
    if (!err && fileData) {
      // compress the date use the gzlib
      zlib.gzip(fileData, (err, buffer) => {
        if (!err && buffer) {
          // send data to the new file
          fs.open(`${lib.baseDir}${destFile}`, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              // write to the new file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                if (!err) {
                  // close new file
                  fs.close(fileDescriptor, err => {
                    if (!err) {
                      callback(false);
                    } else {
                      callback(err);
                    }
                  });
                } else {
                  callback(err);
                }
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// decompress a zip file into string
lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`;
  fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (err, data) => {
    if (!err && data) {
      // decompress the data
      const inputBuffer = Buffer.from(data, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          // callback string
          const data = outputBuffer.toString();
          callback(false, data);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// truncate log file
lib.truncate = (logId, callback) => {
  fs.truncate(`${lib.baseDir}${logId}.log`, err => {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

// export lib
module.exports = lib;
