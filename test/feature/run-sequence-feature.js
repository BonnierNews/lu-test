import runSequence from "../helpers/run-sequence.js";
import { app, messageCounts, resetMessageCounts } from "../utils/broker.js";

const message = {
  id: "some-guid",
  type: "something",
  attributes: { name: "Someone" },
  meta: {},
};

Feature("run-sequence feature", () => {
  beforeEachScenario(resetMessageCounts);

  Scenario("successfully run a sequence", () => {
    let response;
    When("running the sequence", async () => {
      response = await runSequence(app, "sequence.some-sequence", message);
    });
    Then("we should should have a processed sequence", () => {
      response.should.eql({
        topic: "some-topic",
        message: {
          id: "some-guid",
          type: "something",
          attributes: { name: "Someone" },
          meta: {},
          data: [
            { type: "step1", id: "some-id" },
            { type: "step2", id: "some-other-id" },
          ],
        },
        attributes: { key: "sequence.some-sequence.processed" },
        deliveryAttempt: 1,
        triggeredFlows: [ "sequence.some-sequence" ],
      });
    });
  });

  Scenario("sequence doesn't complete successfully", () => {
    let response;
    When("running the sequence", async () => {
      try {
        await runSequence(app, "sequence.broken-sequence", message);
      } catch (error) {
        response = error;
      }
    });
    Then("we should should have a processed sequence", () => {
      response.message.should.eql("Sequence not processed, see log");
    });
  });

  Scenario("run sequence skipping certain keys", () => {
    let response;
    When("running the sequence", async () => {
      response = await runSequence(
        app,
        "sequence.trigger-other-sequence",
        message,
        { skipSequences: [ "sequence.some-sequence" ] }
      );
    });

    Then("we should should have a processed sequence without the skipped step", () => {
      response.should.eql({
        topic: "some-topic",
        message: {
          id: "some-guid",
          type: "something",
          attributes: { name: "Someone" },
          meta: {},
          data: [
            { type: "step1", id: "some-id" },
            { type: "trigger", key: "sequence.some-sequence" },
          ],
        },
        attributes: { key: "sequence.trigger-other-sequence.processed" },
        deliveryAttempt: 1,
        triggeredFlows: [
          "sequence.trigger-other-sequence",
          "sequence.some-sequence",
        ],
      });
    });
  });

  Scenario("run infinite sequence skipping itself after an 3 runs", () => {
    When("running the sequence", async () => {
      await runSequence(
        app,
        "sequence.trigger-itself",
        message,
        { maxRunsForKey: { "sequence.trigger-itself.perform.trigger": 3 } }
      );
    });

    Then("we should only have processed the sequence 3 times", () => {
      messageCounts["sequence.trigger-itself.perform.trigger"].should.eql(3);
    });
  });
});
