import { Writable, Readable } from "stream";
import { Storage } from "@google-cloud/storage";
import { createSandbox } from "sinon";
import config from "exp-config";
import { Blob } from "buffer";

let writes = {}, mocks = {}, readable = {};
let bucketStub;
const sandbox = createSandbox();

export function mockFile(path, opts = { content: "" }) {
  const { Bucket: bucket } = parseUri(path);
  if (!bucketStub) bucketStub = sandbox.stub(Storage.prototype, "bucket");

  return bucketStub.withArgs(bucket).returns({
    getFiles: ({ prefix }) => Object.keys(readable).map((s) => `gs://${bucket}/${s}`).filter((s) => s.includes(prefix)),
    file: getOrCreateFileMock(path, opts),
  });
}

function getOrCreateFileMock(path, opts) {
  const { Key } = parseUri(path);

  if (mocks[Key]) throw new Error(`${path} has already been mocked`);

  readable[Key] = () => Readable.from(opts.content, { encoding: opts.encoding || "utf-8" });

  mocks[Key] = (key) => {
    return {
      createWriteStream: getWriter(key),
      createReadStream: () => readable[key],
      exists: () => [ Boolean(opts.content) ],
      delete: () => delete mocks[key],
      getMetadata: () => ({ name: Key.split("/").pop(), size: new Blob([ opts.content ]).size, contentEncoding: opts.encoding || "utf-8", contentType: contentType(Key) }),
    };
  };

  return mocks[Key];
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

export function written(path) {
  const { Key } = parseUri(path);
  return writes[Key];
}

export function reset() {
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
