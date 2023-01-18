"use strict";

const fakeApi = require("./test/helpers/fake-api");
const fakeFtp = require("./test/helpers/fake-ftp");
const fakeGcs = require("./test/helpers/fake-gcs");
const fakeS3 = require("./test/helpers/fake-s3");
const fakeSes = require("./test/helpers/fake-ses");
const fakeSftp = require("./test/helpers/fake-sftp");
const fileUtils = require("./test/helpers/file-utils");
const messageHelper = require("./test/helpers/message-helper");
const pdfReader = require("./test/helpers/pdfReader");
const clone = require("./test/helpers/clone");
const assertHelpers = require("./test/helpers/assert-helpers");
const buildMessage = require("./test/helpers/build-message");
const fakeCloudTask = require("./test/helpers/fake-cloud-task");
const fakeGcpAuth = require("./test/helpers/fake-gcp-auth");
const fakePubSub = require("./test/helpers/fake-pub-sub");
const requestHelper = require("./test/helpers/request-helper");
const run = require("./test/helpers/run");

module.exports = {
  fakeApi,
  fakeFtp,
  fakeGcs,
  fakeS3,
  fakeSes,
  fakeSftp,
  fileUtils,
  clone,
  messageHelper,
  pdfReader,
  requestHelper,
  GCP: { assertHelpers, buildMessage, fakeCloudTask, fakeGcpAuth, fakePubSub, run },
};
