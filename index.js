var async = require('async');

module.exports = function (stream, chunksize, consumer, cb) {
  var data = '';
  var error = null;

  stream.on('data', function (chunk) {
    if (error) return;
    data += chunk;
    if (data.length >= chunksize) {
      stream.pause();
      var pieces = [];
      while (data.length >= chunksize) {
        var piece = data.substring(0, chunksize);
        pieces.push(data.substring(0, chunksize));
        data = data.substring(chunksize, data.length);
      }
      async.eachSeries(pieces, function (piece, asyncCB) {
        consumer(piece, asyncCB);
      }, function (err) {
        if (err) error = err;
        stream.resume();
      });
    }
  });

  stream.on('error', function (err) {
    error = err;
  });

  stream.on('end', function() {
    if (error) return cb(error);
    if (data.length > 0) {
      return consumer(data, cb);
    }
    cb(null);
  });
}
