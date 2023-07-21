import { expect } from "chai";
import { PubSub } from "@google-cloud/pubsub";

import { app } from "../utils/broker.js";
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

const message = {
  json: {},
  attributes: { key: "sequence.some-sequence.perform.something-else" },
};

Feature("fake-pub-sub feature", () => {
  beforeEachScenario(fakePubSub.reset);

  Scenario("successfully enable publish", () => {
    Given("we have enabled publish", async () => {
      await fakePubSub.enablePublish(app);
    });
    let messagePublisher;
    And("we set the topic", async () => {
      const pubsub = new PubSub();
      messagePublisher = await pubsub.topic("some-topic");
    });
    let response;
    When("publishing a message", async () => {
      response = await messagePublisher.publishMessage(message);
    });
    Then("we should have received a message id", () => {
      response.should.eql("some-message-id");
    });
    And("we should have recorded two messages", () => {
      fakePubSub.recordedMessages().should.eql([
        {
          topic: "some-topic",
          message: {},
          attributes: { key: "sequence.some-sequence.perform.something-else" },
        },
        {
          topic: "some-topic",
          message: { data: [ { type: "step2", id: "some-other-id" } ] },
          attributes: { key: "sequence.some-sequence.processed" },
        },
      ]);
    });
    And("we should have recorded two message handler responses", () => {
      fakePubSub.recordedMessageHandlerResponses().length.should.eql(2);
    });
    And("both messages should have been processed successfully", () => {
      fakePubSub.recordedMessageHandlerResponses().forEach((m) => {
        m.statusCode.should.eql(200, m.text);
        m.body.should.eql({});
      });
    });
  });

  Scenario("successfully trigger a message", () => {
    Given("we have enabled publish", async () => {
      await fakePubSub.enablePublish(app);
    });
    And("we set the topic", async () => {
      const pubsub = new PubSub();
      await pubsub.topic("some-topic");
    });
    let response;
    When("triggering a message with a buffer", async () => {
      response = await fakePubSub.triggerMessage(
        app,
        Buffer.from(JSON.stringify(message.json)),
        message.attributes
      );
    });
    Then("we should receive a 200, Ok", () => {
      response.statusCode.should.eql(200, response.text);
    });
    And("we should receive an empty body", () => {
      response.body.should.eql({ });
    });
  });
});
