import { Writable, Readable } from "stream";
import { Storage } from "@google-cloud/storage";
import { createSandbox } from "sinon";
import { Blob } from "buffer";

let files = {};

let bucketStub;
const sandbox = createSandbox();

export function mockFile(path, opts) {
  const { Bucket: bucket } = parseUri(path);
  if (!bucketStub) bucketStub = sandbox.stub(Storage.prototype, "bucket");

  if (files[path]) throw new Error(`${path} has already been mocked`);

  files[path] = { content: opts?.content, encoding: opts?.encoding || "utf-8" };

  return bucketStub.withArgs(bucket).returns({
    getFiles: ({ prefix }) => Object.keys(files).filter((k) => files[k]?.content && k.includes(prefix)),
    file: (key) => {
      const file = files[`gs://${bucket}/${key}`];
      return {
        createWriteStream: getWriter(file),
        createReadStream: () => Readable.from(file?.content, { encoding: file.encoding || "utf-8" }),
        exists: () => [ Boolean(file.content) ],
        delete: () => delete files[`gs://${bucket}/${key}`],
        getMetadata: () => file?.content ? ({ name: key.split("/").pop(), size: new Blob([ file.content || 0 ]).size, contentEncoding: file.encoding || "utf-8", contentType: contentType(key) }) : undefined,
      };
    },
  });
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

export function written(path) {
  return files[path]?.content;
}

export function reset() {
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
