import { createSandbox } from "sinon";
import { CloudTasksClient } from "@google-cloud/tasks";
import supertest from "supertest";
import config from "exp-config";
import { assert } from "chai";

const sandbox = createSandbox();

let stub, requestAgent;
const messageQueue = []; // Will be used as the actual message queue
const messages = [];
const messageHandlerResponses = [];

function init() {
  if (!stub) {
    stub = sandbox.stub(CloudTasksClient.prototype);
  }
}

export function enablePublish(broker) {
  init();
  requestAgent = supertest.agent(broker);
  stub.createTask = (task) => {
    messageQueue.push({ ...task, taskName: "test-task" });
    return [ { name: "test-task" } ];
  };
}

/** @typedef {import("express").Express} Express */

/** Run a full sequence, returning the first trigger HTTP response
 * @param {Express} broker - The Express application that will run the sequence
 * @param {String} url - The sequence or trigger URL to send the first request to
 * @param {Object} body - The body of the first request
 * @param {Object} headers - The headers of the first request
 * @returns {Promise<{last: Object, triggeredFlows: string[], firstResponse: supertest.Response, messages: object[], messageHandlerResponses: object[]}>}
 */
export async function runSequence(broker, url, body, headers = {}) {
  enablePublish(broker);
  try {
    const firstResponse = await requestAgent.post(url).set(headers).send(body);
    await processMessages();

    const last = messages.slice(-1)[0];
    const triggeredFlows = [ ...new Set(recordedMessages().map((o) => o.url.split("/").slice(-3, -1).join("."))) ];
    return {
      ...last,
      triggeredFlows,
      firstResponse,
      messages: [ ...recordedMessages() ],
      messageHandlerResponses: [ ...recordedMessageHandlerResponses() ],
    };
  } finally {
    reset();
  }
}

export async function processMessages() {
  assert(requestAgent, "You must call `enablePublish` before processing messages");
  while (messageQueue.length) {
    const message = messageQueue.shift();
    await handleMessage(message);
  }
}

async function handleMessage({
  parent,
  task: { httpRequest: { httpMethod, headers, url, body } },
  taskName,
}) {
  const relativeUrl = url.replace(config.cloudTasks.selfUrl, "");
  const queueName = parent.split("/").pop();
  const bodyObject = body ? JSON.parse(body.toString()) : undefined;

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
    ...(bodyObject && { message: bodyObject }),
    correlationId: headers["correlation-id"] || headers.correlationId,
  });
  const response = await requestAgent[httpMethod.toLowerCase()](relativeUrl)
    .set({ ...headers, ...cloudRunHeaders })
    .send(bodyObject);

  messageHandlerResponses.push({
    statusCode: response.statusCode,
    body: response.body,
    headers: response.headers,
    text: response.text,
    error: response.error,
    url: response.req.path,
  });
}

export function reset() {
  messages.length = 0;
  messageHandlerResponses.length = 0;
  messageQueue.length = 0;
  requestAgent = undefined;
  sandbox.restore();
  stub = null;
}

export function recordedMessages() {
  return messages;
}

export function recordedMessageHandlerResponses() {
  return messageHandlerResponses;
}
