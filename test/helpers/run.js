"use strict";
const fakePubSub = require("./fake-pub-sub.js");

async function run(app, sequenceName, message) {
  fakePubSub.enablePublish(app);
  try {
    await fakePubSub.triggerMessage(app, message, { key: sequenceName });
    const last = fakePubSub.recordedMessages()[fakePubSub.recordedMessages().length - 1];
    if (last.attributes.key.split(".").pop() !== "processed") {
      throw new Error("Sequence not processed, see log");
    }
    return last;
  } finally {
    fakePubSub.reset();
  }
}

module.exports = run;
