"use strict";

const request = require("supertest");
const app = require("../../");

function post(path, payload) {
  return request(app)
    .post(path)
    .set("Content-Type", "application/json")
    .send(payload)
    .expect("Content-Type", new RegExp("application/json"));
}

function get(path) {
  return request(app)
    .get(path)
    .set("Content-Type", "application/json")
    .expect("Content-Type", new RegExp("application/json"));
}

module.exports = { post, get };
