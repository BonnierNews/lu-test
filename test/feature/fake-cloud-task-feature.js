import { expect } from "chai";
import { CloudTasksClient } from "@google-cloud/tasks";

import { app } from "../utils/broker.js";
import * as fakeCloudTask from "../helpers/fake-cloud-task.js";

const expectedExports = [
  "enablePublish",
  "fakeCreateTaskError",
  "recordedMessageHandlerResponses",
  "recordedMessages",
  "reset",
];

describe("fake-cloud-task Exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fakeCloudTask).sort().join(",")).to.equal(
        expectedExports.sort().join(",")
      );
    });
  });
});

const message = {
  task: {
    httpRequest: {
      httpMethod: "post",
      body: Buffer.from(
        JSON.stringify({ type: "something", id: "some-id" })
      ).toString("base64"),
    },
  },
};

Feature("fake-cloud-task feature", () => {
  beforeEachScenario(fakeCloudTask.reset);

  Scenario("successfully create a task", () => {
    Given("we have enabled publish", async () => {
      await fakeCloudTask.enablePublish(app);
    });
    let cloudTask;
    And("we have a cloud task instance", () => {
      cloudTask = new CloudTasksClient();
    });
    let response;
    When("creating a task", async () => {
      response = await cloudTask.createTask(message);
    });
    Then("we should have received the task name", () => {
      response.should.eql([ { name: "test-task" } ]);
    });
    And("we should have recorded the message", () => {
      fakeCloudTask
        .recordedMessages()
        .should.eql([
          { httpMethod: "post", message: { type: "something", id: "some-id" } },
        ]);
    });
    And("we should have recorded a message handler response", () => {
      fakeCloudTask.recordedMessageHandlerResponses().length.should.eql(1);
    });
    And("the message should have been processed successfully", () => {
      fakeCloudTask.recordedMessageHandlerResponses().forEach((m) => {
        m.statusCode.should.eql(200, m.text);
        m.body.should.eql({});
      });
    });
  });

  Scenario("successfully faking an errored task", () => {
    Given("we fake create task error", () => {
      fakeCloudTask.fakeCreateTaskError();
    });
    let cloudTask;
    And("we set the topic", () => {
      cloudTask = new CloudTasksClient();
    });
    let response;
    When("creating a task", async () => {
      try {
        await cloudTask.createTask(message);
      } catch (error) {
        response = error;
      }
    });
    Then("we should have received an error", () => {
      response.message.should.eql("Create task failed!!");
    });
  });
});
