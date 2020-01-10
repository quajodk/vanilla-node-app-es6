/**
 * Library for storing and editing data
 */

//  Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// container for the module
const lib = {};

// base directory for storing data
lib.baseDir = path.join(__dirname, '/../.data/');

// write data to file
lib.create = (dir, file, data, callback) => {
  // open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // convert data to string
      const stringData = JSON.stringify(data);

      // write to file and close it
      fs.writeFile(fileDescriptor, stringData, err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing new file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist');
    }
  });
};

// read file
lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', (err, data) => {
    if (!err && data) {
      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  });
};

// update file
lib.update = (dir, file, data, callback) => {
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'a+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // convert data to string
      const stringData = JSON.stringify(data);

      // truncate the file
      fs.truncate(`${lib.baseDir}${dir}/${file}.json`, err => {
        if (!err) {
          // write to file and close it
          fs.writeFile(fileDescriptor, stringData, err => {
            if (!err) {
              fs.close(fileDescriptor, err => {
                if (!err) {
                  callback(false);
                } else {
                  callback('Error closing new file');
                }
              });
            } else {
              callback('Error writing to existing file');
            }
          });
        } else {
          callback('Error truncating the file');
        }
      });
    } else {
      callback('Could not open file');
    }
  });
};

// delete file
lib.delete = (dir, file, callback) => {
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting file');
    }
  });
};

// list files in directory
lib.list = (dir, callback) => {
  fs.readdir(`${lib.baseDir}${dir}/`, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach(fileName => {
        trimmedFileNames.push(fileName.replace('.json', ''));
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

// export module
module.exports = lib;
