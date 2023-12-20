// This is the old style message
function buildMessage(message, data = []) {
  return { ...message, data: [ ...(message.data || []), ...data ] };
}

export default buildMessage;
