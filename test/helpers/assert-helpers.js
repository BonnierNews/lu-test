import chai from "chai";

async function assertRejected(fn) {
  try {
    await fn();
  } catch (error) {
    error.should.have.property("rejected");
    error.rejected.should.eql(true);
    return error;
  }
  throw new chai.AssertionError("not rejected");
}

async function assertRetry(fn) {
  try {
    await fn();
  } catch (error) {
    error.should.not.have.property("rejected");
    return error;
  }
  throw new chai.AssertionError("not retried");
}

async function assertUnrecoverable(fn) {
  try {
    await fn();
  } catch (error) {
    error.should.have.property("unrecoverable");
    return error;
  }
  throw new chai.AssertionError("not unrecoverable");
}

export { assertRejected, assertRetry, assertUnrecoverable };
