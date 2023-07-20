import GoogleAuth from "google-auth-library";

import * as fakeGcpAuth from "../helpers/fake-gcp-auth.js";

Feature("fake-gcp-auth feature", () => {
  beforeEachScenario(fakeGcpAuth.reset);
  Scenario("successfully get GCP auth", () => {
    Given("we enable request headers", () => {
      fakeGcpAuth.enableGetRequestHeaders();
    });
    let response;
    When("making an auth request", async () => {
      const auth = new GoogleAuth.GoogleAuth();
      const client = await auth.getIdTokenClient("some-audience");
      response = await client.getRequestHeaders();
    });
    Then("we should have received an auth header", () => {
      response.should.eql({ Authorization: "Bearer some-gcp-token" });
    });
  });
});
