"use strict";

const sinon = require("sinon");
const GoogleAuth = require("google-auth-library");

const sandbox = sinon.createSandbox();

let stub;

function init() {
  if (!stub) {
    stub = sandbox.stub(GoogleAuth.GoogleAuth.prototype);
  }
}

function enableGetRequestHeaders() {
  init();
  stub.getIdTokenClient = () => {
    return {
      getRequestHeaders: () => {
        return { Authorization: "Bearer some-gcp-token" };
      },
    };
  };
}

function reset() {
  sandbox.restore();
  stub = null;
}

module.exports = {
  enableGetRequestHeaders,
  reset,
};
