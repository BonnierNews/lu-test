import { createSandbox } from "sinon";
import { CloudTasksClient } from "@google-cloud/tasks";
import supertest from "supertest";
import config from "exp-config";

const sandbox = createSandbox();

let stub;
const messages = [];
const messageHandlerResponses = [];

function init() {
  if (!stub) {
    stub = sandbox.stub(CloudTasksClient.prototype);
  }
}

export function enablePublish(broker) {
  init();
  const requestAgent = supertest.agent(broker);

  stub.createTask = async ({
    parent,
    task: { httpRequest: { httpMethod, headers, url, body } },
  }) => {
    const relativeUrl = url.replace(config.cloudTasks.selfUrl, "");
    const queueName = parent.split("/").pop();
    const bodyObject = body ? JSON.parse(body.toString()) : undefined;
    const taskName = "test-task";

    const cloudRunHeaders = {
      "X-CloudTasks-QueueName": queueName,
      "X-CloudTasks-TaskName": taskName,
      "X-CloudTasks-TaskRetryCount": 0,
      "X-CloudTasks-TaskExecutionCount": 1,
      "X-CloudTasks-TaskETA": Date.now(),
    };

    messages.push({
      queue: parent,
      httpMethod,
      headers,
      url: relativeUrl,
      ...(bodyObject && { body: bodyObject }),
    });
    const response = await requestAgent[httpMethod.toLowerCase()](relativeUrl)
      .set({ ...headers, ...cloudRunHeaders })
      .send(bodyObject);

    messageHandlerResponses.push(response);
    return [ { name: taskName } ];
  };
}

export function reset() {
  messages.length = 0;
  messageHandlerResponses.length = 0;
  sandbox.restore();
  stub = null;
}

export function recordedMessages() {
  return messages;
}

export function recordedMessageHandlerResponses() {
  return messageHandlerResponses;
}
