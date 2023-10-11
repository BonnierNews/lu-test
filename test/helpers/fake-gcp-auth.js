import { createSandbox } from "sinon";
import GoogleAuth from "google-auth-library";

const sandbox = createSandbox();

let stub;

function init() {
  if (!stub) {
    stub = sandbox.stub(GoogleAuth.GoogleAuth.prototype);
  }
}

export function authenticated() {
  init();
  stub.getIdTokenClient = () => {
    return {
      getRequestHeaders: () => {
        return { Authorization: "Bearer some-gcp-token" };
      },
    };
  };
}

export function reset() {
  sandbox.restore();
  stub = null;
}
