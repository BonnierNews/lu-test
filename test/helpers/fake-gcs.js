"use strict";

const { Writable, Readable } = require("stream");
const { Storage, Bucket } = require("@google-cloud/storage");
const sandbox = require("sinon").createSandbox();
const config = require("exp-config");

let writes = {}, mocks = {}, readable = {};
let bucketStub, fileStub;

function getWriter(key) {
  return () => {
    return new Writable({
      write: function (chunk, _, next) {
        if (writes[key]) {
          writes[key] += chunk.toString();
        } else {
          writes[key] = chunk.toString();
        }
        next();
      },
    });
  };
}

function getOrCreateFileMock(path, opts) {
  const { Key } = parseUri(path);

  if (mocks[Key]) throw new Error("already implemented");

  readable[Key] = Readable.from(opts.content, { encoding: "utf-8" });

  mocks[Key] = (key) => {
    return {
      createWriteStream: getWriter(key),
      createReadStream: () => readable[key],
      exists: () => [ Boolean(opts.content) ],
      getFiles: () => [ path ],
    };
  };

  return mocks[Key];
}

function mockFile(path, opts = { content: "" }) {
  const { Bucket: bucket } = parseUri(path);
  if (!bucketStub) bucketStub = sandbox.stub(Storage.prototype, "bucket");
  if (!fileStub) fileStub = sandbox.stub(Bucket.prototype, "file");

  bucketStub.withArgs(bucket).returns({ file: getOrCreateFileMock(path, opts) });

}

function written(path) {
  const { Key } = parseUri(path);
  return writes[Key];
}

function reset() {
  bucketStub = null;
  fileStub = null;
  mocks = {};
  writes = {};
  readable = {};
  sandbox.restore();
}

function parseUri(uri) {
  const parts = new URL(uri);
  if (parts.protocol === "gs:") {
    const conf = {
      Bucket: parts.host,
      Key: parts.pathname.slice(1),
    };
    if (conf.Bucket !== config.gcs.bucket) throw new Error(`Invalid gcs bucket ${conf.Bucket}`);
    return conf;
  }
}

module.exports = {
  mockFile,
  reset,
  written,
  writes,
};
