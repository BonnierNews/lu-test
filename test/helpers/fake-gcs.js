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

  files[path] = { content: opts?.content, written: Boolean(opts?.content), encoding: opts?.encoding || "utf-8" };

  return bucketStub.withArgs(bucket).returns({
    getFiles: ({ prefix }) => Object.keys(files).filter((k) => files[k]?.content && k.includes(prefix)),
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
        getMetadata: () => file?.written ? ({ name: key.split("/").pop(), size: new Blob([ file.content ]).size, contentEncoding: file.encoding, contentType: contentType(key) }) : undefined,
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

export function written(path) {
  const file = files[path];
  return file.written && (file.content || "");
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
