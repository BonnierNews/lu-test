import { createSandbox } from "sinon";
import { CloudTasksClient } from "@google-cloud/tasks";
import request from "supertest";

const sandbox = createSandbox();

let stub;
let messages = [];
let messageHandlerResponses = [];

function init() {
  if (!stub) {
    stub = sandbox.stub(CloudTasksClient.prototype);
  }
}

function enablePublish(broker) {
  init();
  stub.queuePath = () => "fix-me";
  stub.createTask = async ({ task }) => {
    const { httpMethod, body } = task.httpRequest;
    const data = JSON.parse(Buffer.from(body, "base64").toString("utf-8"));
    messages.push({
      httpMethod,
      message: data,
    });
    const messageHandlerRes = await request(broker)[httpMethod.toLowerCase()]("/resume-message").send(data);
    messageHandlerResponses.push(messageHandlerRes);
    return [ { name: "test-task" } ];
  };
}

function fakeCreateTaskError() {
  init();
  stub.queuePath = () => "fix-me";
  stub.createTask = () => {
    throw new Error("Create task failed!!");
  };
}

function reset() {
  messages = [];
  messageHandlerResponses = [];
  sandbox.restore();
  stub = null;
}

function recordedMessages() {
  return messages;
}

function recordedMessageHandlerResponses() {
  return messageHandlerResponses;
}

export { enablePublish, fakeCreateTaskError, reset, recordedMessages, recordedMessageHandlerResponses };
