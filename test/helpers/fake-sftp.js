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
    const expectedPatternIncludesSlash = (
      expectedPattern.constructor.name === "RegExp"
        ? expectedPattern.source
        : expectedPattern
    ).includes("/");
    assert(
      !expectedPatternIncludesSlash,
      `expected pattern ${expectedPattern} includes a '/', but that isn't supported by the real sftp client`
    );
  }
  init();
  stub.connect = () => {
    return;
  };
  stub.list = (actualPath, actualPattern) => {
    assert(
      expectedPath === actualPath,
      `expected path ${expectedPath} but got ${actualPath}`
    );
    if (actualPattern.constructor.name === "RegExp") {
      assert(
        expectedPattern.constructor.name === "RegExp" &&
          expectedPattern.source === actualPattern.source,
        `expected pattern ${expectedPattern} but got ${actualPattern}`
      );
    } else {
      assert(
        expectedPattern === actualPattern,
        `expected pattern ${expectedPattern} but got ${actualPattern}`
      );
    }
    return new Promise((resolve) => {
      return resolve(files);
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
      const expectedPatternIncludesSlash = (
        path.expectedPattern.constructor.name === "RegExp"
          ? path.expectedPattern.source
          : path.expectedPattern
      ).includes("/");
      assert(
        !expectedPatternIncludesSlash,
        `expected pattern ${path.expectedPattern} includes a '/', but that isn't supported by the real sftp client`
      );
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
    if (actualPattern.constructor.name === "RegExp") {
      assert(
        mockedPaths[actualPath].expectedPattern.constructor.name === "RegExp" &&
          mockedPaths[actualPath].expectedPattern.source ===
            actualPattern.source,
        `expected pattern ${mockedPaths[actualPath].expectedPattern} but got ${actualPattern}`
      );
    } else {
      assert(
        mockedPaths[actualPath].expectedPattern === actualPattern,
        `expected pattern ${mockedPaths[actualPath].expectedPattern} but got ${actualPattern}`
      );
    }
    return new Promise((resolve) => {
      return resolve(mockedPaths[actualPath].files);
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
