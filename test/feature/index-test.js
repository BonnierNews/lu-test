"use strict";

const common = require("../../index");
const expect = require("chai").expect;

const expectedExports = [
  "fakeApi",
  "fakeFtp",
  "fakeGcs",
  "fakeSftp",
  "fileUtils",
  "clone",
  "messageHelper",
  "pdfReader",
  "requestHelper",
  "assertHelpers",
  "buildMessage",
  "fakeCloudTask",
  "fakeGcpAuth",
  "fakePubSub",
  "run",
  "initFakeApi",
];

describe("Exposed features", () => {
  const exports = [];

  for (const c in common) {
    exports.push(c.toString());
  }

  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      const list = exports.join(",");
      const expectedList = expectedExports.join(",");
      expect(list).to.equal(expectedList);
    });
  });
});
