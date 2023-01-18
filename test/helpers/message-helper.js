"use strict";

function buildMessage(source, data) {
  return { type: "event", data: [ ...(data || []) ], source, meta: source.meta };
}

module.exports = { buildMessage };
