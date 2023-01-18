"use strict";

const { Readable, Transform } = require("stream");
const es = require("event-stream");
const sandbox = require("sinon").createSandbox();
const assert = require("assert");
const s3 = require("../../lib/utils/s3");
let writes = {};

let readStreamStub, writeStreamStub, existsStub, listObjectsStub;

function write(target) {
  if (!writeStreamStub) {
    writeStreamStub = sandbox.stub(s3, "s3FileStreamV2");
  }
  const writer = es.wait((_, data) => {
    writes[target] = data;
  });
  writeStreamStub.withArgs(target).returns({
    writeStream: writer,
    uploadPromise: new Promise((resolve) => resolve()),
    path: target,
  });

  return writer;
}

function writeAndMakeReadable(target, opts = {}, times = 1) {
  if (!writeStreamStub) {
    writeStreamStub = sandbox.stub(s3, "s3FileStreamV2");
  }
  const writer = es.wait((_, data) => {
    writes[target] = data;
    readAsStream(target, data, opts, times);
  });
  writeStreamStub.withArgs(target).returns({
    writeStream: writer,
    uploadPromise: new Promise((resolve) => resolve()),
    path: target,
  });

  return writer;
}

/**
 * The V2 version of this function should be used when the production code uses stream.pipeline and not the /lib/util/streams.js functions
 */
function writeAndMakeReadableV2(target, opts = {}, times = 1) {
  if (!writeStreamStub) {
    writeStreamStub = sandbox.stub(s3, "s3FileStreamV2");
  }

  const writer = async (iterator) => {
    let data = "";
    for await (const row of iterator) {
      data += row;
    }
    writes[target] = data;
    readAsStream(target, data, opts, times);
  };

  writeStreamStub.withArgs(target).returns({
    writeStream: Transform.from(writer), // make it an actual stream since the code depends on stream events,
    uploadPromise: new Promise((resolve) => resolve()),
    path: target,
  });

  return writer;
}

function writeError(message = "s3 file stream error") {
  sandbox.stub(s3, "s3FileStreamV2").throws(new Error(message));
}

function written(path) {
  return writes[path];
}

function exists(expectedPath, fileExists = true) {
  if (!existsStub) {
    existsStub = sandbox.stub(s3, "existsV2");
  }
  existsStub.withArgs(expectedPath).returns(fileExists);
}

function existsMultipleCalls(expectedPath, fileExistsArr) {
  if (!Array.isArray(fileExistsArr)) {
    throw new Error("expected fileExistsArr to be an array");
  }

  if (!existsStub) {
    existsStub = sandbox.stub(s3, "existsV2");
  }

  const stub = existsStub.withArgs(expectedPath);
  for (const i in fileExistsArr) {
    stub.onCall(i).returns(fileExistsArr[i]);
  }
}

function existsError(message = "s3 file stream exists error") {
  if (!existsStub) {
    existsStub = sandbox.stub(s3, "existsV2");
  }
  existsStub.throws(new Error(message));
}

function readAsStream(expectedPath, content, opts = {}, times = 1) {
  assert(content, "no content provided");
  if (!readStreamStub) {
    readStreamStub = sandbox.stub(s3, "readStreamV2");
  }
  const stub = readStreamStub.withArgs(expectedPath);

  for (let i = 0; i < times; i++) {
    const stream = new Readable();
    stream._read = () => {};
    if (opts.format === "buffer") {
      stream.push(Buffer.from(content));
    } else {
      // const encodedContent = iconv.encode(content, opts.encoding || "utf-8").toString();
      content
        .split("\n")
        .filter(Boolean)
        .forEach((o) => {
          stream.push(`${o}\n`, opts.encoding || "utf-8");
        });
    }
    stream.push(null);

    stub.onCall(i).returns(stream);
  }
}

function readError(message = "s3 file stream read error") {
  if (!readStreamStub) {
    readStreamStub = sandbox.stub(s3, "readStreamV2");
  }
  readStreamStub.throws(new Error(message));
}

function readWithPathError(expectedPath, message = "s3 file stream read error") {
  if (!readStreamStub) {
    readStreamStub = sandbox.stub(s3, "readStreamV2");
  }
  const err = new Error(message);
  err.rejected = true;
  readStreamStub.withArgs(expectedPath).throws(err);
}

function listObjects(prefix, contents) {
  if (!Array.isArray(contents)) throw new Error("contents must be an array");
  if (!listObjectsStub) {
    listObjectsStub = sandbox.stub(s3, "listObjectsAsync");
  }
  listObjectsStub.withArgs(prefix).returns({ Contents: contents });
}

function listObjectsError(prefix, message = "s3 list objects error") {
  if (!listObjectsStub) {
    listObjectsStub = sandbox.stub(s3, "listObjectsAsync");
  }
  const error = new Error(message);
  error.rejected = true;
  listObjectsStub.withArgs(prefix).throws(error);
}

function reset() {
  writes = {};
  readStreamStub = null;
  existsStub = null;
  writeStreamStub = null;
  listObjectsStub = null;
  sandbox.restore();
}

/**
 * The V2 version of this function should be used when the production code uses stream.pipeline and not the /lib/util/streams.js functions
 */
function writeV2(target) {
  if (!writeStreamStub) {
    writeStreamStub = sandbox.stub(s3, "s3FileStreamV2");
  }
  const writer = async (iterator) => {
    let data = "";
    for await (const row of iterator) {
      data += row;
    }
    writes[target] = data;
  };

  writeStreamStub.withArgs(target).returns({
    writeStream: Transform.from(writer), // make it an actual stream since the code depends on stream events
    uploadPromise: new Promise((resolve) => resolve()),
    path: target,
  });

  return writer;
}

module.exports = {
  exists,
  existsError,
  readAsStream,
  readError,
  write,
  writeV2,
  writeAndMakeReadable,
  writeAndMakeReadableV2,
  writeError,
  written,
  reset,
  existsMultipleCalls,
  readWithPathError,
  listObjects,
  listObjectsError,
};
