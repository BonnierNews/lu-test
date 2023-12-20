import { expect } from "chai";

import * as requestHelper from "../helpers/request-helper.js";
import init from "../helpers/fake-api.js";
import * as fakeGcpAuth from "../helpers/fake-gcp-auth.js";

const fakeApi = init("http://localhost:8080");

const expectedExports = [ "get", "post" ];

describe("request-helper exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(requestHelper).sort().join(",")).to.equal(expectedExports.sort().join(","));
    });
  });
});

Feature("request-helper feature", () => {
  beforeEachScenario(() => {
    fakeApi.reset();
    fakeApi.disableNetConnect();
    fakeGcpAuth.authenticated();
  });

  after(fakeGcpAuth.reset);

  Scenario("successfully fake a get", () => {
    Given("we have a _status endpoint", () => {
      fakeApi.get("/_status").reply(200, { status: "Ok" });
    });
    let response;
    When("making a get request", async () => {
      response = await requestHelper.get("/_status");
    });
    Then("the status should be 200 OK", () => {
      response.statusCode.should.eql(200, response.text);
    });
  });

  Scenario("successfully fake a post", () => {
    Given("we have a _status endpoint", () => {
      fakeApi.mount({
        request: {
          method: "post",
          path: "/_status",
          body: { what: "everything" },
        },
        statusCode: 200,
        body: { status: "Ok" },
      });
    });
    let response;
    When("making a post request", async () => {
      response = await requestHelper.post("/_status", { what: "everything" });
    });
    Then("the status should be 200 OK", () => {
      response.statusCode.should.eql(200, response.text);
    });
  });
});
