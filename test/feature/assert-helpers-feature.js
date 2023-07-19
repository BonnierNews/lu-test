import { assertRejected, assertRetry } from "../helpers/assert-helpers.js";

const rejectedError = () => {
  try {
    throw new Error("some error");
  } catch (error) {
    error.rejected = true;
    throw error;
  }
};

const retriedError = () => {
  try {
    throw new Error("some error");
  } catch (error) {
    error.retried = true;
    throw error;
  }
};

Feature("assert-helpers feature", () => {
  Scenario("successfully assert rejected", () => {
    let response;
    When("asserting a rejected function", async () => {
      response = await assertRejected(rejectedError);
    });
    Then("we should have received the error message ", () => {
      response.message.should.eql("some error");
    });
  });

  Scenario("successfully error when not rejected", () => {
    let response;
    When("asserting a rejected function", async () => {
      try {
        await assertRejected(() => {});
      } catch (error) {
        response = error;
      }
    });
    Then("we should have errored because it wasn't rejected", () => {
      response.message.should.eql("not rejected");
    });
  });

  Scenario("successfully assert retried", () => {
    let response;
    When("asserting a retried function", async () => {
      response = await assertRetry(retriedError);
    });
    Then("we should have received the error message ", () => {
      response.message.should.eql("some error");
    });
  });

  Scenario("successfully error when not retried", () => {
    let response;
    When("asserting a rejected function", async () => {
      try {
        await assertRetry(() => {});
      } catch (error) {
        response = error;
      }
    });
    Then("we should have errored because it wasn't rejected", () => {
      response.message.should.eql("not retried");
    });
  });
});
