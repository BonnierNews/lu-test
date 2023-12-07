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
export function enablePublish(broker) {
  init();
  requestAgent = supertest.agent(broker);
  stub.topic = (topic) => {
    return {
      publishMessage: async (message) => {
        messages.push({
          topic,
          message: message.json,
          attributes: message.attributes,
        });
        if (topic !== config.deadLetterTopic) {
          const messageHandlerRes = await publish(broker, message.json, message.attributes);
          messageHandlerResponses.push(messageHandlerRes);
          return "some-message-id";
        }
      },
    };
  };
}

export async function triggerMessage(broker, messageData, attributes) {
  return await publish(broker, messageData, attributes);
}

async function publish(app, messageData, attributes) {
  const data = Buffer.isBuffer(messageData) ? JSON.parse(messageData.toString("utf-8")) : messageData;
  const message = {
    message: {
      attributes,
      data: Buffer.from(JSON.stringify(data)).toString("base64"),
      messageId: "some-id",
      publishTime: "123",
    },
    subscription: "some-cool-subscription",
  };
  try {
    return await requestAgent.post("/message").send(message).retry(5);
    /* c8 ignore next 4 */
  } catch (error) {
    console.error("Error in fake-pub-sub :>> ", error); // eslint-disable-line no-console
    throw error;
  }
}

export function reset() {
  messages = [];
  messageHandlerResponses = [];
  sandbox.restore();
  stub = null;
}

export function recordedMessages() {
  return messages;
}

export function recordedMessageHandlerResponses() {
  return messageHandlerResponses;
}
