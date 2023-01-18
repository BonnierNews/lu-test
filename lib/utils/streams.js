"use strict";

const assert = require("assert");
const s3 = require("./s3");

function read(options, context, rowFn) {
  assert(typeof rowFn === "function", "invalid rowFn");
  const { path } = options;
  assert(path, "options.path is not provided");
  assert(context && context.logger, "context is not provided");
  const parts = new URL(path);
  if (parts.protocol !== "s3:") throw new Error(`only s3 paths are implemented got ${path}`);

  const stream = s3Stream(path, context);
  let final = stream;
  for (const p of options.pipes || []) {
    final = final.pipe(p);
  }
  return readData(final, rowFn);
}

function getReadStream(options, context) {
  const { path } = options;
  assert(path, "options.path is not provided");
  assert(context && context.logger, "context is not provided");
  const parts = new URL(path);
  if (parts.protocol !== "s3:") throw new Error(`only s3 paths are implemented got ${path}`);

  return s3Stream(path, context);
}

function open(options, context) {
  const { path } = options;
  assert(path, "options.path is not provided");
  assert(context && context.logger, "context is not provided");
  const parts = new URL(path);
  if (parts.protocol !== "s3:") throw new Error(`only s3 paths are implemented got ${path}`);
  const file = createS3File(path, context);

  return {
    close: async () => await closeS3File(file, context),
    uploadPromise: file.uploadPromise,
    write: (data, encoding = "utf-8") => file.writeStream.write(data, encoding),
    setDefaultEncoding: (encoding) => file.writeStream.setDefaultEncoding(encoding),
    writeStream: file.writeStream,
  };
}

function readData(readStream, rowFn) {
  return new Promise((resolve, reject) => {
    readStream.on("data", async (data) => {
      try {
        if (!data) return;
        await rowFn(data);
      } catch (e) {
        e.rejected = true;
        return reject(e);
      }
    });
    readStream.on("end", () => {
      return resolve();
    });
    readStream.on("error", (e) => {
      return reject(e);
    });
  });
}

function s3Stream(path, context) {
  const readStream = s3.readStreamV2(path);

  readStream.on("error", (err) => {
    context.logger.error(`error when reading ${path}, ${err.toString()}`);
  });
  return readStream;
}

function createS3File(path, context) {
  context.logger.info(`creating file at ${path}`);
  const file = s3.s3FileStreamV2(path);
  file.writeStream.on("data", (data) => {
    context.logger.info(`appending row ${data}`);
  });
  file.writeStream.on("error", (err) => {
    context.logger.error(`error when appending ${err.toString()}`);
  });
  return file;
}

function closeS3File(file, context) {
  return new Promise((resolve, reject) => {
    file.writeStream.on("end", async () => {
      context.logger.info("stream finish");
      try {
        const result = await file.uploadPromise;
        context.logger.info(`uploaded with result ${JSON.stringify(result)}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    context.logger.info("ending stream");
    file.writeStream.end();
  });
}

module.exports = { read, open, getReadStream, readData };
