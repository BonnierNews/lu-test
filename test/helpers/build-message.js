"use strict";

function buildMessage(message, data = []) {
  return { ...message, data: [ ...(message.data || []), ...data ] };
}

module.exports = buildMessage;
