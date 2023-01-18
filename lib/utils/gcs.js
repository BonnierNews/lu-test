"use strict";

const config = require("exp-config");
const { Storage } = require("@google-cloud/storage");
const moment = require("moment");
const path = require("path");

function createWriteStream(gcsPath) {
  const { Bucket, Key } = parseUri(gcsPath);

  const storage = new Storage(config.gcs.credentials);

  const file = storage.bucket(Bucket).file(Key);

  return file.createWriteStream();
}

function createReadStream(gcsPath) {
  const { Bucket, Key } = parseUri(gcsPath);

  const storage = new Storage(config.gcs.credentials);

  const file = storage.bucket(Bucket).file(Key);

  return file.createReadStream();
}

async function exists(gcsPath) {
  const { Bucket, Key } = parseUri(gcsPath);

  const storage = new Storage(config.gcs.credentials);

  const arr = await storage.bucket(Bucket).file(Key).exists();
  return (arr && arr?.shift()) || false;
}

async function list(gcsPath) {
  const { Bucket, Key } = parseUri(gcsPath);

  const storage = new Storage(config.gcs.credentials);

  const opts = { prefix: Key };

  const [ files ] = await storage.bucket(Bucket).getFiles(opts);

  return files?.length ? files : [];
}

function toLakeDate(date) {
  return moment(date).format("[year=]YYYY/[month=]MM/[day=]DD");
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

function lakeUri({
  system,
  type,
  compress = false,
  fileExt = ".json",
  fileName = null,
  date = new Date(),
  version = null,
}) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return [
    `gs://${config.gcs.bucket}/red/brand/all`,
    system,
    type,
    version ?? "",
    `year=${year}/month=${month}/day=${day}`,
    `${fileName || type}${fileExt || ""}${compress ? ".gz" : ""}`,
  ]
    .filter(Boolean)
    .join("/");
}

const extToContentType = {
  ".json": "application/json",
  ".jsonl": "application/x-ndjson",
  ".csv": "text/csv",
};

const metadata = (uri) => {
  const ext = path.extname(path.basename(uri, ".gz"));
  const contentType = extToContentType[ext] ?? "text/plain";
  if (path.extname(uri) === ".gz") {
    return {
      contentEncoding: "gzip",
      contentType,
    };
  }

  return { contentType };
};

function toPath(
  namespace,
  date,
  bucket,
  area,
  classification,
  system,
  dataName,
  version,
  fileName,
  subDirectory1,
  subDirectory2,
  subDirectory3
) {
  if (bucket !== config.gcs.bucket) throw new Error(`Invalid gcs bucket ${bucket}`);
  const subDirectories =
    (subDirectory1 ? `/${subDirectory1}` : "") +
    (subDirectory2 ? `/${subDirectory2}` : "") +
    (subDirectory3 ? `/${subDirectory3}` : "");
  return `gs://${bucket}/brand/${namespace}/${area}/${classification}/${system}/${dataName}/${version}/${toLakeDate(
    date
  )}${subDirectories}/${fileName}`;
}

module.exports = {
  createReadStream,
  createWriteStream,
  exists,
  toLakeDate,
  lakeUri,
  list,
  metadata,
  toPath,
};
