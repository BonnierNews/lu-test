import runSequence from "../helpers/run-sequence.js";

const app = {};
const message = {
  id: "some-guid",
  type: "something",
  attributes: { name: "Someone" },
  meta: {
    createdAt: "2017-09-24T00:00:00.000Z",
    updatedAt: "2017-09-24T00:00:00.000Z",
    correlationId: "some-corrId",
  },
};

// TODO: build this once fake-pub-sub-feature is working
Feature.skip("run-sequence feature", () => {
  Scenario("successfully run a sequence", () => {
    let response;
    When("running the sequence", async () => {
      response = await runSequence(
        app,
        "trigger.sequence.some-sequence",
        message
      );
    });
    Then("we should should have some message data", () => {
      response.should.eql("object");
    });
  });
});
