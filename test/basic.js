var assert     = require('assert');
var fs         = require('fs');
//var mock       = require('mock-fs')
var uuid       = require('node-uuid');
var passStream = require("stream").PassThrough;
var realStringToStream = require('string-to-stream');

var cbstream = require('../index');


var stringToStream = function (string) {
  var filepath = uuid.v4();
  fs.writeFileSync(filepath, string);
  try {
    return fs.createReadStream(filepath, {autoClose: false});
  } catch (err) {
    console.log(err);
  }
}

describe('Basic CBStream', function () {
  before(function (done) {
    //mock();
    done();
  });

  after(function (done) {
    //mock.restore();
    done();
  });

  it('split string', function (done) {
    var stringArray = [];
    cbstream(stringToStream('abcdefghi'), 3, function (chunk, cb) {
      stringArray.push(chunk.toString());
      cb(null);
    }, function (err) {
      assert.ok(!err);
      assert.deepEqual(stringArray, ['abc', 'def', 'ghi']);
      done();
    })
  });

  it('split string with off-chunk length', function (done) {
    var stringArray = [];
    cbstream(stringToStream('abcdefgh'), 3, function (chunk, cb) {
      stringArray.push(chunk.toString());
      cb(null);
    }, function (err) {
      assert.ok(!err);
      assert.deepEqual(stringArray, ['abc', 'def', 'gh']);
      done();
    })
  });

  it('consumer erroring should cause it not to be called again', function (done) {
    var stringArray = [];
    cbstream(stringToStream('abcdefgh'), 3, function (chunk, cb) {
      stringArray.push(chunk.toString());
      cb('an_error');
    }, function (err) {
      assert.ok(err);
      setTimeout(function () {
        assert.deepEqual(stringArray, ['abc']);
        done();
      }, 5);
    })
  });

  it('consumer erroring should cause it not to be called again, even if the stream returns another chunk', function (done) {
    var stringArray = [];

    var mystream = new passStream();
    mystream.write('abc');
    mystream.write('def');
    mystream.end();

    cbstream(mystream, 3, function (chunk, cb) {
      stringArray.push(chunk.toString());
      cb('an_error');
    }, function (err) {
      assert.ok(err);
      setTimeout(function () {
        assert.deepEqual(stringArray, ['abc']);
        done();
      }, 5);
    })
  });

  it('Empty stream should still call callback, but not consumer', function (done) {
    var calledConsumer = false;

    var mystream = new passStream();
    mystream.end();

    cbstream(mystream, 3, function (chunk, cb) {
      calledConsumer = true;
      cb(null);
    }, function (err) {
      assert.ok(!err);
      assert.ok(!calledConsumer);
      done();
    })
  });


  it('Whole stream less than chunk size', function (done) {
    var calledConsumer = false;

    var mystream = new passStream();
    mystream.push('a');
    mystream.end();

    cbstream(mystream, 3, function (chunk, cb) {
      calledConsumer = chunk.toString();
      cb(null);
    }, function (err) {
      assert.ok(!err);
      assert.ok(calledConsumer === 'a');
      done();
    })
  });

  it('Really big stream', function (done) {
    var calledConsumer = false;
    var string = '';
    for (var i = 0; i < 10000; i++) {
      string += 'asdfjkhasdfkhsfkjhasdkfjhaksdjgfh';
    }

    cbstream(stringToStream(string), 10 * 1024 * 1024, function (chunk, cb) {
      calledConsumer = true;
      cb(null);
    }, function (err) {
      assert.ok(!err);
      assert.ok(calledConsumer);
      done();
    })
  });

  it('Really big stream with small chunks', function (done) {
    var calledConsumer = false;
    var string = '';
    for (var i = 0; i < 10000; i++) {
      string += 'asdfjkhasdfkhsfkjhasdkfjhaksdjgfh';
    }
    var len = 0;

    cbstream(stringToStream(string), 1024, function (chunk, cb) {
      calledConsumer = true;
      len += chunk.length;
      cb(null);
    }, function (err) {
      assert.ok(!err);
      assert.ok(calledConsumer);
      assert.ok(len === string.length);
      done();
    })
  });

  it('Really big stream with small chunks and ensure no overlap', function (done) {
    var calledConsumer = false;
    var string = '';
    for (var i = 0; i < 10000; i++) {
      string += 'asdfjkhasdfkhsfkjhasdkfjhaksdjgfh';
    }
    var len = 0;
    var running = false;

    cbstream(stringToStream(string), 10 * 1024, function (chunk, cb) {
      assert.ok(!running);
      running = true;
      calledConsumer = true;
      len += chunk.length;
      setTimeout(function () {
        running = false;
        cb(null);
      }, 2);
    }, function (err) {
      assert.ok(!err);
      assert.ok(calledConsumer);
      assert.ok(len === string.length);
      done();
    })
  });


  it('Really big stream with string-to-stream, small chunks and ensure no overlap', function (done) {
    var calledConsumer = false;
    var string = '';
    for (var i = 0; i < 10000; i++) {
      string += 'asdfjkhasdfkhsfkjhasdkfjhaksdjgfh';
    }
    var len = 0;
    var running = false;

    cbstream(realStringToStream(string), 10 * 1024, function (chunk, cb) {
      assert.ok(!running);
      running = true;
      calledConsumer = true;
      len += chunk.length;
      setTimeout(function () {
        running = false;
        cb(null);
      }, 2);
    }, function (err) {
      assert.ok(!err);
      assert.ok(calledConsumer);
      assert.ok(len === string.length);
      done();
    })
  });
})
