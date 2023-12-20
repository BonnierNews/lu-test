// This is the new style message
function buildMessage(source, data) {
  return { type: "event", data: [ ...(data || []) ], source, meta: source.meta };
}

export { buildMessage };
