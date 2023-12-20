import GoogleAuth from "google-auth-library";

import * as fakeGcpAuth from "../helpers/fake-gcp-auth.js";

Feature("fake-gcp-auth feature", () => {
  beforeEachScenario(fakeGcpAuth.reset);
  Scenario("successfully get GCP auth, without audience", () => {
    Given("we enable request headers", () => {
      fakeGcpAuth.authenticated();
    });
    let response;
    When("making an auth request", async () => {
      const auth = new GoogleAuth.GoogleAuth();
      const client = await auth.getIdTokenClient();
      response = await client.getRequestHeaders();
    });
    Then("we should have received an auth header", () => {
      response.should.eql({ Authorization: "Bearer some-gcp-token" });
    });
  });

  Scenario("successfully get GCP auth, with audience", () => {
    Given("we enable request headers", () => {
      fakeGcpAuth.authenticated();
    });
    let response;
    When("making an auth request", async () => {
      const auth = new GoogleAuth.GoogleAuth();
      const client = await auth.getIdTokenClient("some-audience");
      response = await client.getRequestHeaders();
    });
    Then("we should have received an auth header", () => {
      response.should.eql({ Authorization: "Bearer some-audience" });
    });
  });
});
