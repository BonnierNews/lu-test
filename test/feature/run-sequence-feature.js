import runSequence from "../helpers/run-sequence.js";
import { app } from "../utils/broker.js";

const message = {
  id: "some-guid",
  type: "something",
  attributes: { name: "Someone" },
  meta: {},
};

Feature("run-sequence feature", () => {
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
      });
    });
  });
});
