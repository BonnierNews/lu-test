import { expect } from "chai";

import * as fakePubSub from "../helpers/fake-pub-sub.js";

const expectedExports = [
  "enablePublish",
  "recordedMessageHandlerResponses",
  "recordedMessages",
  "reset",
  "triggerMessage",
];

describe("Exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fakePubSub).sort().join(",")).to.equal(
        expectedExports.sort().join(",")
      );
    });
  });
});

// TODO: write proper tests for this, then do fake-cloud-task too
