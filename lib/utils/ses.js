"use strict";

const config = require("exp-config");
const AWS = require("aws-sdk");
const awsSes = new AWS.SES({
  region: "eu-west-1",
  httpOptions: { timeout: 1000000 },
  accessKeyId: config.ses.accessKeyId,
  secretAccessKey: config.ses.secretAccessKey,
});

const sendEmail = async (namespace, params) => {
  if (namespace !== "expressen") throw new Error(`${namespace} not supported`);
  return await awsSes.sendEmail(params).promise();
};

const sendRawEmail = async (namespace, params) => {
  if (namespace !== "expressen") throw new Error(`${namespace} not supported`);
  return await awsSes.sendRawEmail(params).promise();
};

module.exports = { sendEmail, sendRawEmail };
