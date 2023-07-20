import * as messageHelper from "../helpers/message-helper.js";

const message = { id: "some-id", meta: { correlationId: "some-corr-id" } };
const data = [ { some: "data" } ];
const expectedMessage = {
  type: "event",
  source: message,
  data: [ { some: "data" } ],
  meta: message.meta,
};

Feature("message-helper feature", () => {
  Scenario("successfully build a message with separate data", () => {
    let response;
    When("building a message with separate data", async () => {
      response = await messageHelper.buildMessage(message, data);
    });
    Then("we should have received the message", () => {
      response.should.eql(expectedMessage);
    });
  });

  Scenario("successfully build a message without data", () => {
    let response;
    When("building a message with separate data", async () => {
      response = await messageHelper.buildMessage(message);
    });
    Then("we should have received the message with empty data", () => {
      response.should.eql({ ...expectedMessage, data: [] });
    });
  });
});
