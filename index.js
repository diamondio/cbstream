var async = require('async');

module.exports = function (stream, chunksize, consumer, cb) {
  var data = new Buffer(0);
  var error = null;
  var queue = async.queue(function (piece, queueCB) {
    if (error) return queueCB();
    consumer(piece, function (err) {
      if (err) error = err;
      queueCB();
    });
  });

  queue.drain = function () {
    stream.resume();
  }

  stream.on('data', function (chunk) {
    if (error) return;
    data = Buffer.concat([data, chunk]);
    if (data.length >= chunksize) {
      stream.pause();
      while (data.length >= chunksize) {
        queue.push(data.slice(0, chunksize));
        data = data.slice(chunksize);
      }
    }
  });

  stream.on('error', function (err) {
    error = err;
  });

  stream.on('end', function() {
    if (error) return cb(error);
    if (data && data.length > 0) {
      queue.drain = function () {
        cb(error);
      }
      return queue.push(data);
    }
    cb(null);
  });
}
