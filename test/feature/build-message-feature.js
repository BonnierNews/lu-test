import buildMessage from "../helpers/build-message.js";

const expectedMessage = { id: "some-id", data: [ { some: "data" } ] };

Feature("build-message feature", () => {
  Scenario("successfully build a message with data", () => {
    let response;
    When("building a message with data", async () => {
      response = await buildMessage(expectedMessage);
    });
    Then("we should have received the message", () => {
      response.should.eql(expectedMessage);
    });
  });

  Scenario("successfully build a message with separate data", () => {
    let response;
    When("building a message with separate data", async () => {
      response = await buildMessage({ id: "some-id" }, [ { some: "data" } ]);
    });
    Then("we should have received the message", () => {
      response.should.eql(expectedMessage);
    });
  });

  Scenario("successfully build a message without data", () => {
    let response;
    When("building a message with separate data", async () => {
      response = await buildMessage({ id: "some-id" });
    });
    Then("we should have received the message with empty data", () => {
      response.should.eql({ ...expectedMessage, data: [] });
    });
  });
});
