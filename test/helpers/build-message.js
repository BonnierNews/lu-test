// This is the old style message
export default function buildMessage(message, data = []) {
  return { ...message, data: [ ...(message.data || []), ...data ] };
}
