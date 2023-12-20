import { createSandbox } from "sinon";
import GoogleAuth from "google-auth-library";

const sandbox = createSandbox();

let stub;

function init() {
  if (!stub) {
    stub = sandbox.stub(GoogleAuth.GoogleAuth.prototype);
  }
}

function authenticated() {
  init();
  stub.getIdTokenClient = (audience = "some-gcp-token") => {
    return {
      getRequestHeaders: () => {
        return { Authorization: `Bearer ${audience}` };
      },
    };
  };
}

function reset() {
  sandbox.restore();
  stub = null;
}

export { authenticated, reset };
