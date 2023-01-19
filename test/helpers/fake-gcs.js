"use strict";

const { Writable, Readable } = require("stream");
const { Storage } = require("@google-cloud/storage");
const sandbox = require("sinon").createSandbox();

let writes = {};

let stub;

const mocks = {};

function mockFile(path, opts = { times: 1, readableData: "", exists: false, throw: null }) {
  const pathParts = path.replace("gs://", "").split("/");
  const filePath = pathParts.join("/");
  if (!(stub && mocks[filePath])) {
    // eslint-disable-next-line
    stub = sandbox.stub(Storage.prototype, "bucket").callsFake((bucket) => {
      return {
        // eslint-disable-next-line
        file: (f) => {
          return {
            createWriteStream: () => {
              const writable = new Writable({
                write: function (chunk, encoding, next) {
                  if (writes[path]) {
                    writes[path] += chunk.toString();
                  } else {
                    writes[path] = chunk.toString();
                  }
                  next();
                },
              });
              return writable;
            },
            createReadStream: () => {
              const readable = new Readable();
              if (opts.readableData) {

                if (Buffer.isBuffer(opts.readableData)) {
                  readable.push(Buffer.from(opts.readableData));
                } else {
                  opts.readableData
                    .split("\n")
                    .filter(Boolean)
                    .forEach((o) => {
                      readable.push(`${o}\n`, opts.encoding || "utf-8");
                    });
                }
              }
              readable.push(null);
              return readable;
            },
            exists: () => {
              return [ opts.exists || Boolean(opts.readableData) ];
            },
            // eslint-disable-next-line
            getFiles: ({ prefix }) => {
              return [ path ];
            },
          };
        },
      };
    });
  }
}

// function readError(target, message = "gcs file stream read error") {
//   if (!readStreamStub) {
//     readStreamStub = sandbox.stub(gcs, "createReadStream");
//   }
//   readStreamStub.withArgs(target).throws(new Error(message));
// }

// function listError(path, message = "gcs list error") {
//   if (!listStub) listStub = sandbox.stub(gcs, "list");

//   listStub.withArgs(path).throws(new Error(message));
// }

// function writeError(target, message = "gcs file stream error") {
//   if (!writeStreamStub) {
//     writeStreamStub = sandbox.stub(gcs, "createWriteStream");
//   }
//   writeStreamStub.withArgs(target).throws(new Error(message));
// }

function written(path) {
  return writes[path];
}

function reset() {
  writes = {};
  stub = null;
  sandbox.restore();
}

module.exports = {
  mockFile,
  reset,
  written,
};
