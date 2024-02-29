import { Writable, Readable } from "stream";
import { Storage } from "@google-cloud/storage";
import { createSandbox } from "sinon";
import { Blob } from "buffer";

let files = {};

let bucketStub;
const sandbox = createSandbox();

function mockFile(path, opts) {
  const { Bucket: bucket } = parseUri(path);
  if (!bucketStub) bucketStub = sandbox.stub(Storage.prototype, "bucket");

  if (files[path]) throw new Error(`${path} has already been mocked`);

  files[path] = {
    id: path,
    content: opts?.content,
    written: Boolean(opts?.content),
    encoding: opts?.encoding || "utf-8",
    name: path.replace(`gs://${bucket}`, ""),
  };

  return bucketStub.withArgs(bucket).returns({
    getFiles: ({ prefix }) => {
      // this is weird, an array inside an array. But that's what the real function returns
      return [
        Object.values(files)
          .filter((f) => f.content && f.id.includes(prefix))
          .map(({ id, name }) => ({ id, name })),
      ];
    },
    file: (key) => {
      const file = files[`gs://${bucket}/${key}`];
      return {
        createWriteStream: getWriter(file),
        createReadStream: () => {
          if (file.written && !file.content) {
            file.content = "";
          }
          return Readable.from(file?.content, { encoding: file.encoding });
        },
        exists: () => [ Boolean(file.written) ],
        delete: () => delete files[`gs://${bucket}/${key}`],
        getMetadata: () =>
          file?.written
            ? [
              {
                name: key.split("/").pop(),
                size: new Blob([ file.content ]).size,
                contentEncoding: file.encoding,
                contentType: contentType(key),
              },
            ]
            : undefined,
      };
    },
  });
}

function write(path, opts) {
  mockFile(path, opts);
}

function read(path, content, opts) {
  mockFile(path, { content, ...opts });
}

function readError(path, message = "gcs file stream read error") {
  mockFile(path, {}).throws(new Error(message));
}

function readWithPathError(path, message = "gcs file stream read error") {
  const err = new Error(message);
  err.rejected = true;
  mockFile(path, {}).throws(err);
}

function exists(path, fileExists = true) {
  if (typeof fileExists === "boolean") {
    mockFile(path, { content: fileExists ? "exists" : undefined });
  } else if (Array.isArray(fileExists)) {
    existsMultipleCalls(path, fileExists);
  } else {
    throw new Error("expected fileExists to be a boolean or an array");
  }
}

function existsMultipleCalls(path, fileExistsArr) {
  if (!Array.isArray(fileExistsArr)) {
    throw new Error("expected fileExistsArr to be an array");
  }
  const { Bucket: bucket } = parseUri(path);
  if (!bucketStub) bucketStub = sandbox.stub(Storage.prototype, "bucket");

  for (const i in fileExistsArr) {
    bucketStub
      .withArgs(bucket)
      .onCall(i)
      .returns({
        file: () => {
          return { exists: () => [ fileExistsArr[i] ] };
        },
      });
  }
}

function existsError(path, message = "gcs file stream exists error") {
  mockFile(path, {}).throws(new Error(message));
}

function list(path, filesToList = []) {
  for (const file of filesToList) {
    mockFile(`${path}/${file}`, { content: "exists" });
  }
}

function listError(path, message = "gcs list error") {
  mockFile(path, {}).throws(new Error(message));
}

function writeError(path, message = "gcs file stream error") {
  mockFile(path, {}).throws(new Error(message));
}

function contentType(Key) {
  const ext = Key.split(".").pop();
  switch (ext) {
    case "txt":
      return "text/plain";
    case "json":
      return "application/json";
    case "gz":
      return "application/gzip";
    case "csv":
      return "text/csv";
    default:
      return "application/octet-stream";
  }
}

function getWriter(file) {
  return () => {
    file.written = true;
    return new Writable({
      write: function (chunk, _, next) {
        if (file.content) {
          file.content += chunk.toString();
        } else {
          file.content = chunk.toString();
        }
        next();
      },
    });
  };
}

function written(path) {
  const file = files[path];
  return file.written && (file.content || "");
}

function reset() {
  bucketStub = null;
  files = {};
  sandbox.restore();
}

function parseUri(uri) {
  const parts = new URL(uri);
  if (parts.protocol === "gs:") {
    const conf = {
      Bucket: parts.host,
      Key: parts.pathname.slice(1),
    };
    return conf;
  }
}

export {
  mockFile,
  write,
  writeError,
  reset,
  written,
  exists,
  existsError,
  existsMultipleCalls,
  read,
  readError,
  readWithPathError,
  list,
  listError,
};
