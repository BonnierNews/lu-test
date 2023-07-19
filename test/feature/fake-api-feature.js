import { expect } from "chai";
import axios from "axios";
import config from "exp-config";
import zlib from "zlib";

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

const path = "/some-path",
  content = { id: "some-id", type: "some-type" },
  times = 2;
const basePost = {
  request: { method: "post", path, body: { ...content } },
  statusCode: 200,
  body: { ...content },
};
Feature("fake-api net connect feature", () => {
  beforeEachScenario(fakeApi.reset);

  Scenario("successfully disable net connect", () => {
    Given("net connect is disabled", () => {
      fakeApi.disableNetConnect();
    });
    let response;
    When("trying to get a url", async () => {
      try {
        await axios.get(config.proxyUrl);
      } catch (error) {
        response = error;
      }
    });
    Then("nock should say that net connect is disallowed", () => {
      response.message.should.eql(
        'Nock: Disallowed net connect for "example.com:80/"'
      );
    });
  });
});

Feature("fake-api json response feature", () => {
  beforeEachScenario(fakeApi.reset);

  Scenario("fake json response", () => {
    const url = `${config.proxyUrl}:80${path}`;
    let response;
    When("faking a json response", () => {
      response = fakeApi.fakeJsonResponse(path, content, times);
    });
    Then("the response should contain one interceptor", () => {
      Object.keys(response.keyedInterceptors).length.should.eql(1);
    });
    And("the interceptor should be for the correct URL", () => {
      Object.keys(response.keyedInterceptors)[0].should.eql(`GET ${url}`);
    });
    And(
      "the body, number of times and statusCode should be as expected",
      () => {
        const { body, counter, statusCode } =
          response.keyedInterceptors[`GET ${url}`][0];
        body.should.eql(JSON.stringify(content));
        counter.should.eql(times);
        statusCode.should.eql(200);
      }
    );
  });

  Scenario("fake not existing", () => {
    const url = `${config.proxyUrl}:80${path}`;
    let response;
    When("faking a non-existent endpoint", () => {
      response = fakeApi.fakeNotExisting(path, content, times);
    });
    Then("the response should contain one interceptor", () => {
      Object.keys(response.keyedInterceptors).length.should.eql(1);
    });
    And("the interceptor should be for the correct URL", () => {
      Object.keys(response.keyedInterceptors)[0].should.eql(`GET ${url}`);
    });
    And(
      "the body, number of times and statusCode should be as expected",
      () => {
        const { body, counter, statusCode } =
          response.keyedInterceptors[`GET ${url}`][0];
        body.should.eql(JSON.stringify(content));
        counter.should.eql(times);
        statusCode.should.eql(404);
      }
    );
  });

  Scenario("fake not existing, without a body", () => {
    const url = `${config.proxyUrl}:80${path}`;
    let response;
    When("faking a non-existent endpoint", () => {
      response = fakeApi.fakeNotExisting(path);
    });
    Then("the response should contain one interceptor", () => {
      Object.keys(response.keyedInterceptors).length.should.eql(1);
    });
    And("the interceptor should be for the correct URL", () => {
      Object.keys(response.keyedInterceptors)[0].should.eql(`GET ${url}`);
    });
    And(
      "the body, number of times and statusCode should be as expected",
      () => {
        const { body, counter, statusCode } =
          response.keyedInterceptors[`GET ${url}`][0];
        body.should.eql("{}");
        counter.should.eql(1);
        statusCode.should.eql(404);
      }
    );
  });
});

Feature("fake-api resource feature", () => {
  beforeEachScenario(fakeApi.reset);

  Scenario("fake resource", () => {
    const url = `${config.proxyUrl}:80/${content.type}/${content.id}`;
    let response;
    When("faking a resource", () => {
      response = fakeApi.fakeResource(content, times);
    });
    Then("the response should contain one interceptor", () => {
      Object.keys(response.keyedInterceptors).length.should.eql(1);
    });
    And("the interceptor should be for the correct URL", () => {
      Object.keys(response.keyedInterceptors)[0].should.eql(`GET ${url}`);
    });
    And(
      "the body, number of times and statusCode should be as expected",
      () => {
        const { body, counter, statusCode } =
          response.keyedInterceptors[`GET ${url}`][0];
        body.should.eql(JSON.stringify(content));
        counter.should.eql(times);
        statusCode.should.eql(200);
      }
    );
  });

  Scenario("fake a prefixed resource", () => {
    const url = `${config.proxyUrl}:80${path}/${content.type}/${content.id}`;
    let response;
    When("faking a resource with a prefix", () => {
      response = fakeApi.fakePrefixedResource(path, content, times);
    });
    Then("the response should contain one interceptor", () => {
      Object.keys(response.keyedInterceptors).length.should.eql(1);
    });
    And("the interceptor should be for the correct URL", () => {
      Object.keys(response.keyedInterceptors)[0].should.eql(`GET ${url}`);
    });
    And(
      "the body, number of times and statusCode should be as expected",
      () => {
        const { body, counter, statusCode } =
          response.keyedInterceptors[`GET ${url}`][0];
        body.should.eql(JSON.stringify(content));
        counter.should.eql(times);
        statusCode.should.eql(200);
      }
    );
  });

  Scenario("fake a resource the old way", () => {
    const url = `${config.proxyUrl}:80/${content.type}/${content.id}`;
    Given("a faked resource", () => {
      fakeApi.fakeResources(content);
    });
    let response;
    When("trying to get a url", async () => {
      response = await axios.get(url);
    });
    Then("the status should be 200, Ok", () => {
      response.status.should.eql(200, response.text);
    });
    And("the body should be the expected", () => {
      response.data.should.eql(content);
    });
  });
});

Feature("fake-api mount feature", () => {
  beforeEachScenario(fakeApi.reset);

  Scenario("fake with a mount", () => {
    const url = `${config.proxyUrl}:80${path}`;
    let mount;
    Given("we fake a resource using mount", () => {
      mount = fakeApi.mount(basePost, times);
    });
    let response;
    When("trying to post to a url", async () => {
      response = await axios.post(url, content);
    });
    Then("the status should be 200, Ok", () => {
      response.status.should.eql(200, response.text);
    });
    And("the body should be the expected", () => {
      response.data.should.eql(content);
    });
    And("the mount should have been called with the expected body", () => {
      mount.hasExpectedBody();
    });
    And("the mount's called body should be the expected body", () => {
      mount.calledBody().should.eql(content);
    });
  });

  Scenario("fake with multiple mounts", () => {
    const url = `${config.proxyUrl}:80${path}`;
    const query = { some: "value" };
    const headers = { Accept: "text/json" };
    let mounts;
    Given("we fake multiple resources using mount", () => {
      mounts = fakeApi.mount(
        [
          basePost,
          {
            request: { ...basePost.request, method: "get", query, headers },
            statusCode: basePost.statusCode,
            body: basePost.body,
          },
        ],
        times
      );
    });
    let postResponse;
    When("trying to post to a url", async () => {
      postResponse = await axios.post(url, content);
    });
    Then("the status should be 200, Ok", () => {
      postResponse.status.should.eql(200, postResponse.text);
    });
    And("the body should be the expected", () => {
      postResponse.data.should.eql(content);
    });
    And("the mount should have been called with the expected body", () => {
      mounts[0].hasExpectedBody();
    });
    let getResponse;
    When("trying to get a url", async () => {
      getResponse = await axios.get(url, { params: query, headers });
    });
    Then("the status should be 200, Ok", () => {
      getResponse.status.should.eql(200, getResponse.text);
    });
    And("the body should be the expected", () => {
      getResponse.data.should.eql(content);
    });
  });

  Scenario("fake with a mount and a JSON body, streaming the response", () => {
    const url = `${config.proxyUrl}:80${path}`;
    Given("we fake a resource using mount, streaming the response", () => {
      fakeApi.mount({
        request: { method: "get", path },
        status: 200,
        stream: true,
        body: { ...content },
      });
    });
    let response;
    When("trying to get a url as a stream", async () => {
      response = await axios({
        method: "get",
        url,
        responseType: "stream",
      });
    });
    Then("the status should be 200, Ok", () => {
      response.status.should.eql(200, response.text);
    });
    And("the body should be the expected", async () => {
      const streamedBody = Buffer.concat(await response.data.toArray());
      streamedBody.toString().should.eql(JSON.stringify(content));
    });
  });

  Scenario("fake with a mount and a text body, streaming the response", () => {
    const url = `${config.proxyUrl}:80${path}`;
    Given("we fake a resource using mount, streaming the response", () => {
      fakeApi.mount({
        request: { method: "get", path },
        status: 200,
        stream: true,
        body: JSON.stringify(content),
      });
    });
    let response;
    When("trying to get a url as a stream", async () => {
      response = await axios({
        method: "get",
        url,
        responseType: "stream",
      });
    });
    Then("the status should be 200, Ok", () => {
      response.status.should.eql(200, response.text);
    });
    And("the body should be the expected", async () => {
      const streamedBody = Buffer.concat(await response.data.toArray());
      streamedBody.toString().should.eql(JSON.stringify(content));
    });
  });

  Scenario("fake with a mount and a JSON body, compressing and streaming the response", () => {
    const url = `${config.proxyUrl}:80${path}`;
    Given(
      "we fake a resource using mount, compressing and streaming the response",
      () => {
        fakeApi.mount(
          {
            request: { method: "get", path },
            stream: true,
            compress: true,
            body: { ...content },
          },
          times
        );
      }
    );
    let response;
    When("trying to get a url as a stream", async () => {
      response = await axios.get(url, { responseType: "stream" });
    });
    Then("the status should be 200, Ok", () => {
      response.status.should.eql(200, response.text);
    });
    And("the body should be the expected", async () => {
      const compressed = Buffer.concat(await response.data.toArray());
      zlib.gunzip(compressed, (err, decompressed) => {
        if (err) {
          console.error(err); // eslint-disable-line no-console
        }
        decompressed.toString().should.eql(JSON.stringify(content));
      });
    });
  });

  Scenario("fake with a mount and a text body, compressing and streaming the response", () => {
    const url = `${config.proxyUrl}:80${path}`;
    Given(
      "we fake a resource using mount, compressing and streaming the response",
      () => {
        fakeApi.mount(
          {
            request: { method: "get", path },
            stream: true,
            compress: true,
            body: JSON.stringify(content),
          },
          times
        );
      }
    );
    let response;
    When("trying to get a url as a stream", async () => {
      response = await axios.get(url, { responseType: "stream" });
    });
    Then("the status should be 200, Ok", () => {
      response.status.should.eql(200, response.text);
    });
    And("the body should be the expected", async () => {
      const compressed = Buffer.concat(await response.data.toArray());
      zlib.gunzip(compressed, (err, decompressed) => {
        if (err) {
          console.error(err); // eslint-disable-line no-console
        }
        decompressed.toString().should.eql(JSON.stringify(content));
      });
    });
  });

  Scenario("fake with a mount, wrong url", () => {
    const url = config.proxyUrl.replace("http", "https");
    let mount;
    When("we try to mount a resource with a bad baseUrl", () => {
      try {
        fakeApi.mount({ request: { baseUrl: url } });
      } catch (error) {
        mount = error;
      }
    });
    Then("we should receive an error about mismatching urls", () => {
      mount.message.should.eql(`Mismatching urls ${url} ${config.proxyUrl}`);
    });
  });
});

Feature("fake-api external mount feature", () => {
  beforeEachScenario(fakeApi.reset);

  Scenario("fake with an external mount", () => {
    let mounts;
    When("we fake an external resource using mount", () => {
      mounts = fakeApi.mountExternal({ something: basePost });
    });
    Then("there should be 1 external mount", () => {
      mounts.length.should.eql(1);
    });
    And("the external mount should be as expected", () => {
      mounts[0].external.should.eql(basePost);
    });
    And("the mount should not have been called", () => {
      mounts[0].mount.hasNotBeenCalled();
    });
  });

  Scenario("fake with an external, with no data", () => {
    let mounts;
    When("we try to fake an empty external mount", () => {
      try {
        fakeApi.mountExternal();
      } catch (error) {
        mounts = error;
      }
    });
    Then("we should receive an error about missing an object", () => {
      mounts.message.should.eql(
        "Could not mount, provided object is empty or missing external property"
      );
    });
  });
});
