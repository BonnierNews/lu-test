"use strict";

const { Writable, Readable } = require("stream");
const { Storage } = require("@google-cloud/storage");
const sandbox = require("sinon").createSandbox();
const config = require("exp-config");

let writes = {}, mocks = {}, readable = {};
let bucketStub;

function mockFile(path, opts = { content: "" }) {
  const { Bucket: bucket } = parseUri(path);
  if (!bucketStub) bucketStub = sandbox.stub(Storage.prototype, "bucket");

  bucketStub.withArgs(bucket).returns({ file: getOrCreateFileMock(path, opts) });
}

function getOrCreateFileMock(path, opts) {
  const { Bucket: bucket, Key } = parseUri(path);

  if (mocks[Key]) throw new Error(`${path} has already been mocked`);

  readable[Key] = Readable.from(opts.content, { encoding: "utf-8" });

  mocks[Key] = (key) => {
    return {
      createWriteStream: getWriter(key),
      createReadStream: () => readable[key],
      exists: () => [ Boolean(opts.content) ],
      getFiles: ({ prefix }) => Object.keys(readable).map((s) => `gs://${bucket}/${s}`).filter((s) => s.includes(prefix)),
    };
  };

  return mocks[Key];
}

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

function written(path) {
  const { Key } = parseUri(path);
  return writes[Key];
}

function reset() {
  bucketStub = null;
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
};
