"use strict";

const moment = require("moment");
const config = require("exp-config");
const stream = require("stream");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  httpOptions: { timeout: 1000000 },
  accessKeyId: config.s3.accessKeyId,
  secretAccessKey: config.s3.secretAccessKey,
});

const existsV2 = async (s3Path) => {
  const { Bucket, Key } = parseUri(s3Path);
  return await s3
    .headObject({
      Bucket,
      Key,
    })
    .promise()
    .then(
      () => true,
      (err) => {
        if (err.code === "NotFound") {
          return false;
        }
        throw err;
      }
    );
};

const readStreamV2 = (s3Path) => {
  const { Bucket, Key } = parseUri(s3Path);
  try {
    const object = s3.getObject({ Bucket, Key });
    return object.createReadStream();
  } catch (error) {
    error.rejected = true;
    throw error;
  }
};

const s3FileStreamV2 = (s3Path) => {
  const { Bucket, Key, Classification } = parseUri(s3Path);
  const pass = new stream.PassThrough();
  return {
    writeStream: pass,
    uploadPromise: s3
      .upload({ Bucket, Key, Body: pass }, { tags: [ { Key: "classification", Value: Classification } ] })
      .promise(),
    path: `s3://${Bucket}/${Key}`,
  };
};

function parseUri(uri) {
  const parts = new URL(uri);
  if (parts.protocol === "s3:") {
    const conf = {
      Bucket: parts.host,
      Key: parts.path.slice(1),
      Classification: parts.path.split("/")[4],
    };
    if (conf.Bucket !== config.s3.bucket) throw new Error(`Invalid s3 bucket ${conf.Bucket}`);
    if (![ "red", "yellow", "green" ].includes(conf.Classification)) conf.Classification = "red";
    return conf;
  }
}

function listObjectsAsync(s3Path) {
  const { Bucket, Key: Prefix } = parseUri(s3Path);
  return new Promise((resolve, reject) => {
    s3.listObjectsV2(
      {
        Bucket,
        Prefix,
      },
      (error, data) => {
        if (error) {
          error.rejected = true;
          reject(error);
        } else {
          resolve(data);
        }
      }
    );
  });
}

function toLakeDate(date) {
  return moment(date).format("[year=]YYYY/[month=]MM/[day=]DD");
}

function toPath(
  namespace,
  date,
  bucket,
  area,
  classification,
  system,
  dataName,
  fileName,
  subDirectory1,
  subDirectory2,
  subDirectory3
) {
  const subDirectories =
    (subDirectory1 ? `/${subDirectory1}` : "") +
    (subDirectory2 ? `/${subDirectory2}` : "") +
    (subDirectory3 ? `/${subDirectory3}` : "");
  if (bucket !== config.s3.bucket) throw new Error(`Invalid s3 bucket ${bucket}`);
  return `s3://${bucket}/brand/${namespace}/${area}/${classification}/${system}/${dataName}/v1/${toLakeDate(
    date
  )}${subDirectories}/${fileName}`;
}

module.exports = { toLakeDate, existsV2, readStreamV2, s3FileStreamV2, toPath, parseUri, listObjectsAsync };
