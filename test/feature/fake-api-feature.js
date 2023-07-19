import { expect } from "chai";
import axios from "axios";

import init from "../helpers/fake-api.js";

axios.defaults.validateStatus = () => true; // make request unasserted
const fakeApi = init();

const expectedExports = [
  "clone",
  "disableNetConnect",
  "fakeJsonResponse",
  "fakeNotExisting",
  "fakePrefixedResource",
  "fakeResources",
  "fakeResource",
  "filteringPath",
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "mount",
  "pendingMocks",
  "matchHeader",
  "reset",
  "mountExternal",
];

describe("Exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fakeApi).sort().join(",")).to.equal(
        expectedExports.sort().join(",")
      );
    });
  });
});

Feature("fake-api feature", () => {
  Scenario("successfully disable net connect", () => {
    Given("net connect is disabled", () => {
      fakeApi.disableNetConnect();
    });
    let response;
    When("trying to get a url", () => {
      try {
        axios.get("http://example.com");
      } catch (error) {
        response = error;
      }
    });
    Then("nock should say that we have no mock", () => {
      response.should.eql("broken");
    });
  });
});
