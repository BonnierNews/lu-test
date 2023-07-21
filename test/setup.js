// This file is required with .mocharc.json

// set process.env variables in a separate file so they are resolved before config is imported
import envVars from "./setup-env.js"; // eslint-disable-line

import "mocha-cakes-2";
import chai from "chai";
import chaiExclude from "chai-exclude";
import config from "exp-config";

// Setup common test libraries
chai.use(chaiExclude);

chai.config.truncateThreshold = 0;
chai.config.includeStack = true;

Object.assign(global, { should: chai.should() });

process.on("unhandledRejection", (err) => {
  if (!config.boolean("silenceTestErrors")) {
    // eslint-disable-next-line no-console
    console.log("Caught rejection:}");
    // eslint-disable-next-line no-console
    console.error(err);
  }
  throw err;
});
