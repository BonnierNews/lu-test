import { enablePublish, triggerMessage, recordedMessages, reset } from "./fake-pub-sub.js";

async function runSequence(app, sequenceName, message, throwOnError = true) {
  enablePublish(app);
  try {
    await triggerMessage(app, message, { key: sequenceName }, { throwOnError });
    const last = recordedMessages()[recordedMessages().length - 1];
    if (last?.attributes?.key?.split(".").pop() !== "processed") {
      throw new Error("Sequence not processed, see log");
    }
    const triggeredFlows = [
      ...new Set(recordedMessages().map((o) => o.attributes.key.split(".").slice(0, 2).join("."))),
    ];
    return { ...last, triggeredFlows };
  } finally {
    reset();
  }
}

export default runSequence;
