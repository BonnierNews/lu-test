import { expect } from "chai";
import { CloudTasksClient } from "@google-cloud/tasks";
import config from "exp-config";
import express from "express";

import * as fakeCloudTask from "../helpers/fake-cloud-tasks.js";

const expectedExports = [ "enablePublish", "recordedMessages", "recordedMessageHandlerResponses", "reset" ];

describe("fake-cloud-task Exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fakeCloudTask).sort().join(",")).to.equal(expectedExports.sort().join(","));
    });
  });
});

Feature("fake-cloud-task feature", () => {
  beforeEachScenario(fakeCloudTask.reset);

  Scenario("successfully create a task", () => {
    Given("we have enabled publish", async () => {
      const app = express();
      app.use(express.json());
      app.post("/foo/bar", (req, res) => res.status(200).json({ status: "ok" }).send());

      await fakeCloudTask.enablePublish(app);
    });

    let cloudTask;
    And("we have a cloud task instance", () => {
      cloudTask = new CloudTasksClient();
    });

    let response;
    When("creating a task", async () => {
      response = await cloudTask.createTask({
        parent: config.cloudTasks.queue,
        task: {
          httpRequest: {
            url: `${config.cloudTasks.selfUrl}/foo/bar`,
            httpMethod: "post",
            body: Buffer.from(JSON.stringify({ type: "something", id: "some-id" })),
            headers: { correlationId: "some-epic-id" },
          },
        },
      });
    });

    Then("we should have received the task name", () => {
      response.should.eql([ { name: "test-task" } ]);
    });

    And("we should have recorded the message", () => {
      fakeCloudTask.recordedMessages()[0].should.eql({
        queue: config.cloudTasks.queue,
        httpMethod: "post",
        body: { type: "something", id: "some-id" },
        url: "/foo/bar",
        headers: { correlationId: "some-epic-id" },
      });
    });

    And("we should have recorded a message handler response", () => {
      fakeCloudTask
        .recordedMessageHandlerResponses()[0]
        .should.deep.include({ body: { status: "ok" }, statusCode: 200 });
    });
  });

  Scenario("successfully create a task with a GET request", () => {
    Given("we have enabled publish", async () => {
      const app = express();
      app.use(express.json());
      app.get("/foo/bar", (req, res) => res.status(200).json({ status: "ok" }).send());

      await fakeCloudTask.enablePublish(app);
    });

    let cloudTask;
    And("we have a cloud task instance", () => {
      cloudTask = new CloudTasksClient();
    });

    let response;
    When("creating a task", async () => {
      response = await cloudTask.createTask({
        parent: config.cloudTasks.queue,
        task: {
          httpRequest: {
            url: `${config.cloudTasks.selfUrl}/foo/bar`,
            httpMethod: "get",
            headers: { correlationId: "some-epic-id" },
          },
        },
      });
    });

    Then("we should have received the task name", () => {
      response.should.eql([ { name: "test-task" } ]);
    });

    And("we should have recorded the message", () => {
      fakeCloudTask.recordedMessages()[0].should.eql({
        queue: config.cloudTasks.queue,
        httpMethod: "get",
        url: "/foo/bar",
        headers: { correlationId: "some-epic-id" },
      });
    });

    And("we should have recorded a message handler response", () => {
      fakeCloudTask
        .recordedMessageHandlerResponses()[0]
        .should.deep.include({ body: { status: "ok" }, statusCode: 200 });
    });
  });
});
