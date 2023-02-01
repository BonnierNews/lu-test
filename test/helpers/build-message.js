export default function buildMessage(message, data = []) {
  return { ...message, data: [ ...(message.data || []), ...data ] };
}
