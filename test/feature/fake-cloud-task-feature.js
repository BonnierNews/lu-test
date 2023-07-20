import { expect } from "chai";

import * as fakeCloudTask from "../helpers/fake-cloud-task.js";

const expectedExports = [
  "enablePublish",
  "fakeCreateTaskError",
  "recordedMessageHandlerResponses",
  "recordedMessages",
  "reset",
];

describe("fake-cloud-task Exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fakeCloudTask).sort().join(",")).to.equal(
        expectedExports.sort().join(",")
      );
    });
  });
});

// TODO: write proper tests for this, once pubsub tests are written
