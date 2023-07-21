import { expect } from "chai";

import * as helpers from "../../index.js";

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
  "assertRejected",
  "assertRetry",
  "buildMessage",
  "fakeCloudTask",
  "fakeGcpAuth",
  "fakePubSub",
  "runSequence",
];

describe("Exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(helpers).sort().join(",")).to.equal(
        expectedExports.sort().join(",")
      );
    });
  });
});
