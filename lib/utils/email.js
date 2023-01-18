"use strict";

const s3 = require("./s3");
const streams = require("./streams");
const ses = require("./ses");
const config = require("exp-config");
const moment = require("moment");

async function sendEmailWithS3File(namespace, s3Path, emailParameters, context) {
  const { rejectUnless, http, rejectIf } = context;
  rejectUnless(await s3.existsV2(s3Path), `need ${s3Path} to proceed`);

  rejectUnless(namespace, "Missing namespace");
  rejectUnless(emailParameters, "Missing email parameters");
  rejectUnless(emailParameters.sender, "Missing email sender");
  rejectUnless(emailParameters.recipients, "Missing email recipients");
  rejectUnless(emailParameters.subject, "Missing email subject");

  const fileName = emailParameters.fileName || s3Path.split("/").pop();

  const cache = [];
  await streams.read({ path: s3Path }, context, (o) => {
    cache.push(o);
  });

  const buffer = Buffer.concat(cache);
  const messageBoundary = "a1b2c3d4e3f2g1";
  const mailContent = [
    `From: '${emailParameters.sender}'`,
    `To: ${emailParameters.recipients.join(",")}`,
    `Subject: ${emailParameters.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${messageBoundary}"`,
    "\n",
    `--${messageBoundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "\n",
    emailParameters.body || "Please see the attached file",
    "\n",
    `--${messageBoundary}`,
    `Content-Type: application/octet-stream; name="${fileName}"`,
    "Content-Transfer-Encoding: base64",
    "Content-Disposition: attachment",
    "\n",
    `${buffer.toString("base64").replace(/([^\0]{76})/g, "$1\n")}`,
    "\n",
    `--${messageBoundary}--`,
  ].join("\n");

  const emailParams = { RawMessage: { Data: mailContent.toString() } };

  let emailRes;
  try {
    emailRes = await ses.sendRawEmail(namespace, emailParams);
  } catch (error) {
    const fields = [
      { title: "Filename", value: fileName, short: false },
      { title: "s3Path", value: s3Path, short: false },
      { title: "Time", value: moment(), short: false },
    ];
    slackIt(http, fields);
    rejectIf(error, error.message);
  }

  const { MessageId: messageId } = emailRes;

  return { type: "aws-ses__email", id: messageId };
}

async function slackIt(http, fields = []) {
  const fallback = fields.s3Path;

  await http.post({
    baseUrl: config.slack.webhookBaseUrl,
    path: config.slack.webhookUrl,
    body: {
      username: `distribution-worker-${config.envName}`,
      icon_emoji: ":floppy_disk:", // eslint-disable-line camelcase
      channel: config.slack.criticalChannel,
      fallback,
      pretext: "AWS email sender",
      color: "danger",
      fields,
    },
  });
}

module.exports = sendEmailWithS3File;
