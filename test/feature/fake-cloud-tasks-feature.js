import { expect } from "chai";
import { CloudTasksClient } from "@google-cloud/tasks";
import config from "exp-config";
import express from "express";

import * as fakeCloudTasks from "../helpers/fake-cloud-tasks.js";

const expectedExports = [
  "enablePublish",
  "runSequence",
  "processMessages",
  "recordedMessages",
  "recordedMessageHandlerResponses",
  "reset",
];

describe("fake-cloud-task Exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fakeCloudTasks).sort().join(",")).to.equal(expectedExports.sort().join(","));
    });
  });
});

Feature("fake-cloud-task feature", () => {
  beforeEachScenario(fakeCloudTasks.reset);

  Scenario("successfully create a task", () => {
    Given("we have enabled publish", async () => {
      const app = express();
      app.use(express.json());
      app.post("/foo/bar", (req, res) => res.status(200).json({ status: "ok" }).send());

      await fakeCloudTasks.enablePublish(app);
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
          name: "test-task",
          httpRequest: {
            url: `${config.cloudTasks.selfUrl}/foo/bar`,
            httpMethod: "post",
            body: Buffer.from(JSON.stringify({ type: "something", id: "some-id" })),
            headers: { correlationId: "some-epic-id" },
          },
        },
      });
    });

    And("the task has been run", async () => {
      await fakeCloudTasks.processMessages();
    });

    Then("we should have received the task name", () => {
      response.should.eql([ { name: "test-task" } ]);
    });

    And("we should have recorded the message", () => {
      fakeCloudTasks.recordedMessages()[0].should.eql({
        taskName: "test-task",
        queue: config.cloudTasks.queue,
        httpMethod: "post",
        message: { type: "something", id: "some-id" },
        url: "/foo/bar",
        headers: { correlationId: "some-epic-id" },
        correlationId: "some-epic-id",
      });
    });

    And("we should have recorded a message handler response", () => {
      fakeCloudTasks
        .recordedMessageHandlerResponses()[0]
        .should.deep.include({ body: { status: "ok" }, statusCode: 200 });
    });
  });

  Scenario("successfully create a task with a GET request", () => {
    Given("we have enabled publish", async () => {
      const app = express();
      app.use(express.json());
      app.get("/foo/bar", (req, res) => res.status(200).json({ status: "ok" }).send());

      await fakeCloudTasks.enablePublish(app);
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
          name: "test-task",
          httpRequest: {
            url: `${config.cloudTasks.selfUrl}/foo/bar`,
            httpMethod: "get",
            headers: { correlationId: "some-epic-id" },
          },
        },
      });
    });

    And("the task has been run", async () => {
      await fakeCloudTasks.processMessages();
    });

    Then("we should have received the task name", () => {
      response.should.eql([ { name: "test-task" } ]);
    });

    And("we should have recorded the message", () => {
      fakeCloudTasks.recordedMessages()[0].should.eql({
        taskName: "test-task",
        queue: config.cloudTasks.queue,
        httpMethod: "get",
        url: "/foo/bar",
        headers: { correlationId: "some-epic-id" },
        correlationId: "some-epic-id",
      });
    });

    And("we should have recorded a message handler response", () => {
      fakeCloudTasks
        .recordedMessageHandlerResponses()[0]
        .should.deep.include({ body: { status: "ok" }, statusCode: 200 });
    });
  });

  Scenario("trying to run sequence without enabling publication", () => {
    let error;
    When("trying to process messages", async () => {
      try {
        await fakeCloudTasks.processMessages();
      } catch (err) {
        error = err;
      }
    });

    Then("we should have received an error", () => {
      error.message.should.eql("You must call `enablePublish` before processing messages");
    });
  });
});

const sequenceTriggeringSequence = (req, res) => {
  const cloudTask = new CloudTasksClient();
  [ "task1", "task2" ].forEach((task) => {
    cloudTask.createTask({
      parent: config.cloudTasks.queue,
      task: {
        name: `test-${task}`,
        httpRequest: {
          url: `${config.cloudTasks.selfUrl}/v2/sequence/${task}`,
          httpMethod: "post",
          headers: { correlationId: "some-epic-id" },
          body: Buffer.from(JSON.stringify({ task })),
        },
      },
    });
  });
  res.status(200).json({ status: "ok" }).send();
};

Feature("cloud tasks run-sequence feature", () => {
  beforeEachScenario(fakeCloudTasks.reset);

  Scenario("successfully run a sequence", () => {
    let app;
    Given("a broker", () => {
      app = express();
      app.use(express.json());
      app.post("/sequence", (req, res) => {
        const cloudTask = new CloudTasksClient();
        [ "task1", "task2" ].forEach((task) => {
          cloudTask.createTask({
            parent: config.cloudTasks.queue,
            task: {
              name: `test-${task}`,
              httpRequest: {
                url: `${config.cloudTasks.selfUrl}/foo/bar`,
                httpMethod: "post",
                headers: { correlationId: "some-epic-id" },
                body: Buffer.from(JSON.stringify({ task })),
              },
            },
          });
        });
        res.status(200).json({ status: "ok" }).send();
      });
      app.post("/foo/bar", (req, res) => res.status(200).json({ task: req.body.task }).send());
    });

    let result;
    When("running the sequence", async () => {
      result = await fakeCloudTasks.runSequence(app, "/sequence");
    });

    Then("two messages should have been published", () => {
      result.messages.should.eql([
        {
          message: { task: "task1" },
          headers: { correlationId: "some-epic-id" },
          httpMethod: "post",
          queue: config.cloudTasks.queue,
          url: "/foo/bar",
          correlationId: "some-epic-id",
          taskName: "test-task1",
        },
        {
          message: { task: "task2" },
          headers: { correlationId: "some-epic-id" },
          httpMethod: "post",
          queue: config.cloudTasks.queue,
          url: "/foo/bar",
          correlationId: "some-epic-id",
          taskName: "test-task2",
        },
      ]);
    });

    And("the messages should have been processed", () => {
      result.messageHandlerResponses
        .map((response) => response.body)
        .should.eql([ { task: "task1" }, { task: "task2" } ]);
    });
  });

  Scenario("successfully run a sequence, skipping the triggering of a sequence", () => {
    let app;
    Given("a broker", () => {
      app = express();
      app.use(express.json());
      app.post("/sequence", sequenceTriggeringSequence);
    });

    let result;
    When("running the sequence", async () => {
      result = await fakeCloudTasks.runSequence(app, "/sequence");
    });

    Then("two sequences should have been not have been tested", () => {
      result.messages.should.eql([
        {
          queue: config.cloudTasks.queue,
          url: "/v2/sequence/task1/testing-skipped",
          message: { task: "task1" },
        },
        {
          queue: config.cloudTasks.queue,
          url: "/v2/sequence/task2/testing-skipped",
          message: { task: "task2" },
        },
      ]);
    });

    And("the sequences should not have been tested", () => {
      result.messageHandlerResponses
        .map((response) => response.body)
        .should.eql([ "Triggered sequence not tested", "Triggered sequence not tested" ]);
    });

    And("the sequences should have been triggered with the expected messages", () => {
      result.notTestedSequences.should.eql([
        {
          queue: "projects/project-id/locations/location/queues/foo-queue",
          url: "/v2/sequence/task1/testing-skipped",
          message: { task: "task1" },
        },
        {
          queue: "projects/project-id/locations/location/queues/foo-queue",
          url: "/v2/sequence/task2/testing-skipped",
          message: { task: "task2" },
        },
      ]);
    });
  });

  Scenario("successfully run a sequence, and trigger another sequence from it", () => {
    let app;
    Given("a broker", () => {
      app = express();
      app.use(express.json());
      app.post("/sequence", sequenceTriggeringSequence);
      app.post("/v2/sequence/:task", (req, res) => res.status(200).json({ task: req.params.task }).send());
    });

    let result;
    When("running the sequence", async () => {
      result = await fakeCloudTasks.runSequence(app, "/sequence", undefined, {}, false);
    });

    Then("two messages should have been published", () => {
      result.messages.should.eql([
        {
          message: { task: "task1" },
          headers: { correlationId: "some-epic-id" },
          httpMethod: "post",
          queue: config.cloudTasks.queue,
          url: "/v2/sequence/task1",
          correlationId: "some-epic-id",
          taskName: "test-task1",
        },
        {
          message: { task: "task2" },
          headers: { correlationId: "some-epic-id" },
          httpMethod: "post",
          queue: config.cloudTasks.queue,
          url: "/v2/sequence/task2",
          correlationId: "some-epic-id",
          taskName: "test-task2",
        },
      ]);
    });

    And("the messages should have been processed", () => {
      result.messageHandlerResponses
        .map((response) => response.body)
        .should.eql([ { task: "task1" }, { task: "task2" } ]);
    });

    And("the sequences should have been triggered with the expected messages", () => {
      result.messages.should.eql([
        {
          queue: "projects/project-id/locations/location/queues/foo-queue",
          taskName: "test-task1",
          httpMethod: "post",
          headers: { correlationId: "some-epic-id" },
          url: "/v2/sequence/task1",
          message: { task: "task1" },
          correlationId: "some-epic-id",
        },
        {
          queue: "projects/project-id/locations/location/queues/foo-queue",
          taskName: "test-task2",
          httpMethod: "post",
          headers: { correlationId: "some-epic-id" },
          url: "/v2/sequence/task2",
          message: { task: "task2" },
          correlationId: "some-epic-id",
        },
      ]);
    });
  });

  Scenario("Error occurs during sequence processing", () => {
    let app;
    Given("a broker", () => {
      app = express();
      app.use(express.json());
      app.post("/sequence", (req, res) => {
        const cloudTask = new CloudTasksClient();
        [ "task1", "task2" ].forEach((task) => {
          cloudTask.createTask({
            parent: config.cloudTasks.queue,
            task: {
              name: `test-${task}`,
              httpRequest: {
                url: `${config.cloudTasks.selfUrl}/foo/bar`,
                httpMethod: "post",
                headers: { correlationId: "some-epic-id" },
                body: Buffer.from(JSON.stringify({ task })),
              },
            },
          });
        });
        res.status(200).json({ status: "ok" }).send();
      });
      app.post("/foo/bar", (req, res) =>
        res
          .status(500)
          .json({ errors: [ { detail: "You broke it!" } ] })
          .send()
      );
    });

    let result;
    When("running the sequence", async () => {
      try {
        await fakeCloudTasks.runSequence(app, "/sequence");
      } catch (error) {
        result = error;
      }
    });

    Then("we should receive an error", () => {
      result.message.should.eql(
        'Failed to process message, check the logs: {"statusCode":500,"body":{"errors":[{"detail":"You broke it!"}]},"text":"{\\"errors\\":[{\\"detail\\":\\"You broke it!\\"}]}"}'
      );
    });
  });
});
