"use strict";

module.exports = {
  request: { method: "post", path: "/some-path", body: { id: "some-id", type: "some-type" } },
  statusCode: 200,
  body: { id: "some-id", type: "some-type" },
};
