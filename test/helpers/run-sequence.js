import { enablePublish, triggerMessage, recordedMessages, reset } from "./fake-pub-sub.js";

export default async function runSequence(app, sequenceName, message) {
  enablePublish(app);
  try {
    await triggerMessage(app, message, { key: sequenceName });
    const last = recordedMessages()[recordedMessages().length - 1];
    if (last?.attributes?.key?.split(".").pop() !== "processed") {
      throw new Error("Sequence not processed, see log");
    }
    return last;
  } finally {
    reset();
  }
}
