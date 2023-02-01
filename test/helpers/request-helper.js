import assert from "assert";
import request from "supertest";
import { readFileSync } from "fs";

const { main } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8"));

const url = `http://localhost:${process.env.PORT || 8080}`;

export async function post(path, payload) {
  assert(main, "missing entry point, specify it in package.json");
  await import(`../../${main}`);

  return request(url)
    .post(path)
    .set("Content-Type", "application/json")
    .send(payload)
    .expect("Content-Type", new RegExp("application/json"));
}

export async function get(path) {
  await assert(main, "missing entry point, specify it in package.json");
  await import(`../../${main}`);

  return request(url)
    .get(path)
    .set("Content-Type", "application/json")
    .expect("Content-Type", new RegExp("application/json"));
}
