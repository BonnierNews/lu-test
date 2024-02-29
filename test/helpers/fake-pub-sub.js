import { createSandbox } from "sinon";
import { PubSub } from "@google-cloud/pubsub";
import supertest from "supertest";
import config from "exp-config";

const sandbox = createSandbox();

let stub;
let messages = [];
let messageHandlerResponses = [];

function init() {
  if (!stub) {
    stub = sandbox.stub(PubSub.prototype);
  }
}

let requestAgent;
function enablePublish(broker) {
  init();
  requestAgent = supertest.agent(broker);
  stub.topic = (topic) => {
    return {
      publishMessage: async (message) => {
        messages.push({
          topic,
          message: message.json,
          attributes: message.attributes,
          deliveryAttempt: message.deliveryAttempt || 1,
        });
        if (topic !== config.deadLetterTopic) {
          const messageHandlerRes = await publish(broker, message.json, message.attributes, { deliveryAttempt: message.deliveryAttempt || 1 });
          messageHandlerResponses.push(messageHandlerRes);
          return "some-message-id";
        }
      },
    };
  };
}

async function triggerMessage(
  broker,
  messageData,
  attributes,
  { deliveryAttempt = 1, messageId = "some-id", publishTime = "123" } = {}
) {
  return await publish(broker, messageData, attributes, { deliveryAttempt, messageId, publishTime });
}

async function publish(
  app,
  messageData,
  attributes,
  { deliveryAttempt = 1, messageId = "some-id", publishTime = "123" } = {}
) {
  const data = Buffer.isBuffer(messageData) ? JSON.parse(messageData.toString("utf-8")) : messageData;
  const message = {
    message: {
      attributes,
      data: Buffer.from(JSON.stringify(data)).toString("base64"),
      messageId,
      publishTime,
    },
    subscription: "some-cool-subscription",
    deliveryAttempt,
  };
  try {
    const response = await requestAgent.post("/message").send(message);
    if (response.status >= 400) {
      const error = Error(`Got error when publishing message ${JSON.stringify(message)}`);
      error.statusCode = response.status;
      error.body = response.body;
      error.text = response.text;
      throw error;
    }
    return response;
    /* c8 ignore next 4 */
  } catch (error) {
    console.error("Error in fake-pub-sub :>> ", error); // eslint-disable-line no-console
    throw error;
  }
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

export { enablePublish, triggerMessage, reset, recordedMessages, recordedMessageHandlerResponses };
