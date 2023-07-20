import express from "express";
import expressPromiseRouter from "express-promise-router";

export function route(key, fn) {
  const result = {};
  result[key] = fn;
  return result;
}

function messageHandler(req, res) {
  return res.status(200).send(req.body);
}

export function start() {
  const router = expressPromiseRouter();
  const app = express();
  app.use(express.json());

  router.post("/message", messageHandler.bind(messageHandler));

  app.use(router);

  return app;
}
