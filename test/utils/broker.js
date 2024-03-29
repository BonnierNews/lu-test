// This is a bare minimum broker implementation, doing just enough to be able to test the test-helpers
// For a full, working broker implementation with pub/sub, see BonnierNews/b0rker
// For a full, working broker implementation with rabbitMQ, see BonnierNews/lu-broker
import express from "express";
import expressPromiseRouter from "express-promise-router";
import { PubSub } from "@google-cloud/pubsub";

function initRecipes(recipes) {
  const recipeMap = {};
  const firstMap = {};
  const lambdaMap = {};

  const useParentCorrelationIdMap = {};
  recipes.forEach((r) => (useParentCorrelationIdMap[`trigger.${r.namespace}.${r.name}`] = r.useParentCorrelationId));

  recipes.forEach((recipe) => {
    const prefix = `${recipe.namespace}.${recipe.name}`;
    recipe.sequence.forEach((step, idx) => {
      const [ key ] = Object.keys(step);
      const [ next ] = recipe.sequence[idx + 1] ? Object.keys(recipe.sequence[idx + 1]) : [ ".processed" ];
      if (next !== ".processed" || recipe.name !== "broken-sequence") {
        recipeMap[`${prefix}${key}`] = `${prefix}${next}`;
      }
    });

    if (recipe.sequence[0]) {
      const [ key ] = Object.keys(recipe.sequence[0]);
      firstMap[prefix] = `${prefix}${key}`;
    }
  });

  recipes.forEach((recipe) => {
    const prefix = `${recipe.namespace}.${recipe.name}`;
    recipe.sequence.forEach((step) => {
      const [ key, fn ] = Object.entries(step)[0];
      lambdaMap[`${prefix}${key}`] = fn;
    });
  });
  return {
    first: (key) => firstMap[`${key}`],
    next: (replyKey) => recipeMap[replyKey],
    handler: (routingKey) => {
      return lambdaMap[routingKey];
    },
  };
}

function route(key, fn) {
  const result = {};
  result[key] = fn;
  return result;
}

function parseBody(body) {
  const { message, subscription, deliveryAttempt } = body;
  const { attributes, data, messageId, publishTime } = message;
  const parsedData = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));

  return {
    subscription,
    attributes,
    messageId,
    publishTime,
    deliveryAttempt,
    message: parsedData,
  };
}

export const messageCounts = {};

export function resetMessageCounts() {
  for (const key in messageCounts) {
    delete messageCounts[key];
  }
}

async function messageHandler(recipeMap, req, res) {
  const messageData = parseBody(req.body);
  const { key } = messageData.attributes;
  const { message } = messageData;
  const data = [ ...(message.data ?? []) ];

  messageCounts[key] = (messageCounts[key] || 0) + 1;

  if (key.endsWith("processed")) {
    res.status(200).send();
    return;
  }
  const handler = recipeMap.handler(key);
  if (!handler) {
    const firstStep = recipeMap.first(key);
    const pubsub = new PubSub();
    const messagePublisher = await pubsub.topic("some-topic");
    await messagePublisher.publishMessage({
      json: { ...message, data },
      attributes: { key: firstStep },
    });
    res.status(200).send();
    return;
  }

  const result = await handler(message);
  const newData = [ ...data ];

  const pubsub = new PubSub();
  const messagePublisher = await pubsub.topic("some-topic");

  if (result) {
    newData.push(result);

    if (result.type === "trigger") {
      const triggerKey = recipeMap.first(result.key);
      await messagePublisher.publishMessage({
        json: { ...message },
        attributes: { key: triggerKey },
      });
    }
  }

  const nextStep = recipeMap.next(key);
  if (!nextStep) {
    res.status(200).send(req.body);
    return;
  }

  await messagePublisher.publishMessage({
    json: { ...message, data: newData },
    attributes: { key: nextStep },
  });

  res.status(200).send();
  return;
}

function start({ recipes, triggers }) {
  const router = expressPromiseRouter();
  const app = express();
  app.use(express.json());

  const recipeMap = initRecipes(recipes, triggers);

  router.post("/message", messageHandler.bind(messageHandler, recipeMap));

  app.use(router);

  return app;
}

export const app = start({
  recipes: [
    {
      namespace: "sequence",
      name: "some-sequence",
      sequence: [
        route(".perform.something", () => {
          return { type: "step1", id: "some-id" };
        }),
        route(".perform.something-else", () => {
          return { type: "step2", id: "some-other-id" };
        }),
      ],
    },
    {
      namespace: "sequence",
      name: "broken-sequence",
      sequence: [
        route(".perform.something", () => {
          return { type: "step1", id: "some-id" };
        }),
      ],
    },
    {
      namespace: "sequence",
      name: "trigger-other-sequence",
      sequence: [
        route(".perform.something", () => {
          return { type: "step1", id: "some-id" };
        }),
        route(".perform.trigger", () => {
          return { type: "trigger", key: "sequence.some-sequence" };
        }),
      ],
    },
    {
      namespace: "sequence",
      name: "trigger-itself",
      sequence: [
        route(".perform.trigger", () => {
          return { type: "trigger", key: "sequence.trigger-itself" }; // Yes, this is an infinite loop
        }),
      ],
    },
  ],
});
