import es from "event-stream";
import SftpClient from "ssh2-sftp-client";
import { createSandbox } from "sinon";
import { Readable } from "stream";
import assert from "assert";
import * as buff from "buffer";

let writes = {};
let removes = {};
let stub, targetPath;
const mockedPaths = {};
let expectedExistPaths = {};

const sandbox = createSandbox();

function init() {
  if (!stub) {
    stub = sandbox.stub(SftpClient.prototype);
  }
}

function get(expectedPath, content) {
  stub.get = (actualPath, writeStream) => {
    assert(expectedPath === actualPath, `expected path ${expectedPath} but got ${actualPath}`);
    if (!writeStream) {
      // if the is no witeStream return content as a buffer
      const buffer = Buffer.from(content);
      return new Promise((resolve) => {
        return resolve(buffer);
      });
    }
    const stream = Readable.from([ content ]);
    return stream.pipe(writeStream);
  };
}

function getAsStream(expectedPath, content) {
  init();
  stub.connect = () => {};
  get(expectedPath, content);
}

function getMany(expectedFiles) {
  init();
  stub.connect = () => {};
  const expectedPaths = Object.keys(expectedFiles);
  stub.get = (actualPath, writeStream) => {
    assert(expectedPaths.includes(actualPath), `expected paths ${expectedPaths.join(", ")} to include ${actualPath}`);
    if (!writeStream) {
      // if the is no writeStream return content as a buffer
      const buffer = Buffer.from(expectedFiles[actualPath]);
      return new Promise((resolve) => {
        return resolve(buffer);
      });
    }
    const stream = Readable.from([ expectedFiles[actualPath] ]);
    return stream.pipe(writeStream);
  };
}

function getManyAsStream(expectedFiles) {
  init();
  getMany(expectedFiles);
}

function copy(expectedSourcePath, expectedTargetPath, content) {
  init();
  assert(content, "No content supplied");

  stub.connect = () => {};
  get(expectedSourcePath, content);
  stub.put = (buffer, actualTarget) => {
    assert(expectedTargetPath === actualTarget, `expected path ${expectedTargetPath} but got ${actualTarget}`);
    return new Promise((resolve) => {
      writes[actualTarget] = buffer;
      return resolve();
    });
  };
}

function put(expectedTargetPath, opts) {
  init();
  stub.connect = () => {};
  stub.put = (readStream, actualTarget) => {
    targetPath = actualTarget;
    if (expectedTargetPath) {
      assert(expectedTargetPath === actualTarget, `expected path ${expectedTargetPath} but got ${actualTarget}`);
    }
    return new Promise((resolve) => {
      const writer = es.wait((_, data) => {
        if (opts?.encoding) {
          data = buff.transcode(Buffer.from(data), "utf8", opts.encoding);
        }
        writes[actualTarget] = data;
        return resolve();
      });
      readStream.pipe(writer);
    });
  };
}

function putMany(expectedTargetPaths) {
  init();
  stub.connect = () => {};
  stub.put = (readStream, actualTarget) => {
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

function putError(message = "sftp put failed") {
  init();
  stub.connect = () => {};
  stub.put = () => {
    throw new Error(message);
  };
}

function list(expectedPath, expectedPattern, files) {
  if (expectedPattern) {
    assert(typeof expectedPattern === "function", `expected pattern ${expectedPattern} needs to be a function`);
  }
  init();
  stub.connect = () => {};
  stub.list = (actualPath, actualPattern) => {
    assert(expectedPath === actualPath, `expected path ${expectedPath} but got ${actualPath}`);
    assert(typeof actualPattern === "function", `actual pattern ${actualPattern} needs to be a function`);
    let matchedFiles = files;
    if (actualPattern) matchedFiles = files.filter((file) => actualPattern(file));
    return new Promise((resolve) => {
      return resolve(matchedFiles);
    });
  };
}

function listMany(expectedPaths) {
  init();
  stub.connect = () => {};
  expectedPaths.map((path) => {
    if (path.expectedPattern) {
      assert(
        typeof path.expectedPattern === "function",
        `expected pattern ${path.expectedPattern} needs to be a function`
      );
    }
    mockedPaths[path.expectedPath] = {
      expectedPattern: path.expectedPattern,
      files: path.files,
    };
  });
  stub.list = (actualPath, actualPattern) => {
    assert(mockedPaths[actualPath], `expected paths ${Object.keys(mockedPaths)} but got ${actualPath}`);
    let matchedFiles = mockedPaths[actualPath].files;
    if (actualPattern) matchedFiles = matchedFiles.filter((file) => actualPattern(file));
    return new Promise((resolve) => {
      return resolve(matchedFiles);
    });
  };
}

function remove(expectedPath) {
  init();
  stub.connect = () => {};
  stub.exists = (actualPath) => {
    if (expectedPath === actualPath) {
      return "-";
    }
    return false; // file does not exist
  };

  stub.delete = (filePath) => {
    removes[filePath] = true;
  };
}

function connectionError(message = "sftp connection failed") {
  init();
  stub.connect = () => {
    throw new Error(message);
  };
}

function written(path) {
  if (Buffer.isBuffer(writes[path])) {
    return writes[path].toString();
  }
  return writes[path];
}

function writtenAsBuffer(path) {
  if (Buffer.isBuffer(writes[path])) {
    return writes[path];
  }
  return Buffer.from(writes[path]);
}

function removed(path) {
  return removes[path];
}

function reset() {
  writes = {};
  removes = {};
  sandbox.restore();
  stub = null;
  expectedExistPaths = {};
}

function exists(expectedPath, fileExists) {
  expectedExistPaths[expectedPath] = fileExists;
  init();
  stub.connect = () => {
    return;
  };
  stub.exists = (actualPath) => {
    assert(Object.keys(expectedExistPaths).includes(actualPath), `SFTP exists for path ${actualPath} was not expected`);
    return new Promise((resolve) => {
      return resolve(expectedExistPaths[actualPath]);
    });
  };
}

function getTargetPath() {
  return targetPath;
}

export {
  copy,
  getAsStream,
  getManyAsStream,
  getTargetPath,
  connectionError,
  written,
  writtenAsBuffer,
  remove,
  removed,
  reset,
  put,
  putMany,
  putError,
  list,
  listMany,
  exists,
};
