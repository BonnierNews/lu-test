// This is the new style message
export function buildMessage(source, data) {
  return { type: "event", data: [ ...(data || []) ], source, meta: source.meta };
}
