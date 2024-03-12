import es from "event-stream";
import ftp from "basic-ftp";
import { createSandbox } from "sinon";
import assert from "assert";
import iconvlite from "iconv-lite";

let writes = {};
let stub;
const sandbox = createSandbox();

function init() {
  if (!stub) {
    stub = sandbox.stub(ftp.Client.prototype);
  }
}

function put(expectedTargetPath) {
  init();
  stub.access = () => {
    return;
  };
  stub.uploadFrom = (readStream, actualTarget) => {
    assert(expectedTargetPath === actualTarget, `expected path ${expectedTargetPath} but got ${actualTarget}`);
    return new Promise((resolve) => {
      const writer = es.wait((_, data) => {
        writes[actualTarget] = data;
        return resolve();
      });
      readStream.pipe(writer);
    });
  };
}

function putMany(expectedTargetPaths) {
  init();
  stub.access = () => {
    return;
  };
  stub.uploadFrom = (readStream, actualTarget) => {
    assert(
      expectedTargetPaths.includes(actualTarget),
      `expected paths ${expectedTargetPaths.join(", ")} to include ${actualTarget}`
    );
    return new Promise((resolve) => {
      const writer = es.wait((_, data) => {
        writes[actualTarget] = data;
        return resolve();
      });
      readStream.pipe(writer);
    });
  };
}

function putError(message = "ftp put failed") {
  init();
  stub.access = () => {
    return;
  };
  stub.uploadFrom = () => {
    throw new Error(message);
  };
}

function connectionError(message = "ftp connection failed") {
  init();
  stub.access = () => {
    throw new Error(message);
  };
}

function written(path, opts) {
  if (opts?.encoding) {
    return iconvlite.decode(writes[path], opts.encoding);
  }
  if (Buffer.isBuffer(writes[path])) {
    return writes[path].toString();
  }
  return writes[path];
}

function reset() {
  writes = {};
  sandbox.restore();
  stub = null;
}

export { put, putMany, putError, connectionError, written, reset };
