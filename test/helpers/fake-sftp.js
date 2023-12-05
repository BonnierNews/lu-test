import es from "event-stream";
import SftpClient from "ssh2-sftp-client";
import { createSandbox } from "sinon";
import { Readable } from "stream";
import assert from "assert";

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
    assert(
      expectedPath === actualPath,
      `expected path ${expectedPath} but got ${actualPath}`
    );
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

export function getAsStream(expectedPath, content) {
  init();
  stub.connect = () => {
    return;
  };
  get(expectedPath, content);
}

function getMany(expectedFiles) {
  const expectedPaths = Object.keys(expectedFiles);
  stub.get = (actualPath, writeStream) => {
    assert(
      expectedPaths.includes(actualPath),
      `expected paths ${expectedPaths.join(", ")} to include ${actualPath}`
    );
    if (!writeStream) {
      // if there is no writeStream return content as a buffer
      const buffer = Buffer.from(expectedFiles[actualPath]);
      return new Promise((resolve) => {
        return resolve(buffer);
      });
    }
    const stream = Readable.from([ expectedFiles[actualPath] ]);
    return stream.pipe(writeStream);
  };
}

export function getManyAsStream(expectedFiles) {
  init();
  stub.connect = () => {
    return;
  };
  getMany(expectedFiles);
}

export function copy(expectedSourcePath, expectedTargetPath, content) {
  init();
  assert(content, "No content supplied");

  stub.connect = () => {
    return;
  };
  get(expectedSourcePath, content);
  stub.put = (buffer, actualTarget) => {
    assert(
      expectedTargetPath === actualTarget,
      `expected path ${expectedTargetPath} but got ${actualTarget}`
    );
    return new Promise((resolve) => {
      writes[actualTarget] = buffer;
      return resolve();
    });
  };
}

export function put(expectedTargetPath) {
  init();
  stub.connect = () => {
    return;
  };
  stub.put = (readStream, actualTarget) => {
    targetPath = actualTarget;
    if (expectedTargetPath) {
      assert(
        expectedTargetPath === actualTarget,
        `expected path ${expectedTargetPath} but got ${actualTarget}`
      );
    }
    return new Promise((resolve) => {
      const writer = es.wait((_, data) => {
        writes[actualTarget] = data;
        return resolve();
      });
      readStream.pipe(writer);
    });
  };
}

export function putMany(expectedTargetPaths) {
  init();
  stub.connect = () => {
    return;
  };
  stub.put = (readStream, actualTarget) => {
    assert(
      expectedTargetPaths.includes(actualTarget),
      `expected paths ${expectedTargetPaths.join(
        ", "
      )} to include ${actualTarget}`
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

export function putError(message = "sftp put failed") {
  init();
  stub.connect = () => {
    return;
  };
  stub.put = () => {
    throw new Error(message);
  };
}

export function list(expectedPath, expectedPattern, files) {
  if (expectedPattern) {
    assert(typeof expectedPattern === "function", `expected pattern ${expectedPattern} needs to be a function`);
  }
  init();
  stub.connect = () => {
    return;
  };
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

export function listMany(expectedPaths) {
  init();
  stub.connect = () => {
    return;
  };
  expectedPaths.map((path) => {
    if (path.expectedPattern) {
      assert(typeof path.expectedPattern === "function", `expected pattern ${path.expectedPattern} needs to be a function`);
    }
    mockedPaths[path.expectedPath] = {
      expectedPattern: path.expectedPattern,
      files: path.files,
    };
  });
  stub.list = (actualPath, actualPattern) => {
    assert(
      mockedPaths[actualPath],
      `expected paths ${Object.keys(mockedPaths)} but got ${actualPath}`
    );
    let matchedFiles = mockedPaths[actualPath].files;
    if (actualPattern) matchedFiles = matchedFiles.filter((file) => actualPattern(file));
    return new Promise((resolve) => {
      return resolve(matchedFiles);
    });
  };
}

export function remove(expectedPath) {
  init();
  stub.connect = () => {
    return;
  };
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

export function connectionError(message = "sftp connection failed") {
  init();
  stub.connect = () => {
    throw new Error(message);
  };
}

export function written(path) {
  if (Buffer.isBuffer(writes[path])) {
    return writes[path].toString();
  }
  return writes[path];
}

export function writtenAsBuffer(path) {
  if (Buffer.isBuffer(writes[path])) {
    return writes[path];
  }
  return Buffer.from(writes[path]);
}

export function removed(path) {
  return removes[path];
}

export function reset() {
  writes = {};
  removes = {};
  sandbox.restore();
  stub = null;
  expectedExistPaths = {};
}

export function exists(expectedPath, fileExists) {
  expectedExistPaths[expectedPath] = fileExists;
  init();
  stub.connect = () => {
    return;
  };
  stub.exists = (actualPath) => {
    assert(
      Object.keys(expectedExistPaths).includes(actualPath),
      `SFTP exists for path ${actualPath} was not expected`
    );
    return new Promise((resolve) => {
      return resolve(expectedExistPaths[actualPath]);
    });
  };
}

export function getTargetPath() {
  return targetPath;
}
