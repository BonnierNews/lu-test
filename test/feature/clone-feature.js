import clone from "../helpers/clone.js";

const object = { prop1: "text", prop2: [ { prop3: "deep" } ] };

Feature("clone feature", () => {
  Scenario("successfully clone an object", () => {
    let response;
    When("building a message with data", async () => {
      response = await clone(object);
    });
    Then("we should have received a copy of the object", () => {
      response.should.eql(object);
    });
  });
});
