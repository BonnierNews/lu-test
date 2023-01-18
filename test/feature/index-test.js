"use strict";

const common = require("../../index");
const expect = require("chai").expect;

const expectedExports = [
  "fakeApi",
  "fakeFtp",
  "fakeGcs",
  "fakeS3",
  "fakeSes",
  "fakeSftp",
  "fileUtils",
  "messageHelper",
  "pdfReader",
  "clone",
  "GCP",
  "requestHelper",
];

describe("Exposed features", () => {
  const exports = [];

  for (const c in common) {
    exports.push(c.toString());
  }

  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      const list = exports.filter((val) => !expectedExports.includes(val));
      const list2 = expectedExports.filter((val) => !exports.includes(val));
      expect(list.length).to.equal(0);
      expect(list2.length).to.equal(0);
    });
  });
});
