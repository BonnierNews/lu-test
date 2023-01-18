"use strict";

const sandbox = require("sinon").createSandbox();
const ses = require("../../lib/utils/ses");

let sendEmailStub, sendRawEmailStub;
const sent = [];
const sentRaw = [];

function sendEmail(response) {
  if (!sendEmailStub) sendEmailStub = sandbox.stub(ses, "sendEmail");

  const fn = (namespace, params) => {
    sent.push(params);
    return response;
  };

  sendEmailStub.callsFake(fn);
}

function sendRawEmail(response) {
  if (!sendRawEmailStub) sendRawEmailStub = sandbox.stub(ses, "sendRawEmail");

  const fn = (namespace, params) => {
    sentRaw.push(params);
    return response;
  };

  sendRawEmailStub.callsFake(fn);
}

// eslint-disable-next-line
function sendRawEmailWithError(errorMessage) {
  if (!sendRawEmailStub) sendRawEmailStub = sandbox.stub(ses, "sendRawEmail");

  // eslint-disable-next-line
  const fn = () => {
    throw new Error(errorMessage);
  };

  sendRawEmailStub.callsFake(fn);
}

function reset() {
  sendEmailStub = null;
  sendRawEmailStub = null;
  sent.splice(0, sent.length);
  sentRaw.splice(0, sentRaw.length);
  sandbox.restore();
}

module.exports = { sendEmail, sendRawEmail, reset, sent, sentRaw, sendRawEmailWithError };
