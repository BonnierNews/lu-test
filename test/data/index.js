"use strict";
const path = require("path");
const fs = require("fs");

function getFile(filename) {
  if (path.extname(filename) === ".wsdl" || path.extname(filename) === ".xml") {
    return fs.readFileSync(path.resolve(__dirname) + filename, "utf8");
  } else if (filename.endsWith("/contracts/") || filename.endsWith("/contracts")) {
    const files = fs.readdirSync(path.join(__dirname, `/${filename}`));
    return files.map((file) => require(`./${filename}${file}`));
  } else if (typeof require(`./${filename}`) === "function") {
    return require(`./${filename}`);
  }
  return JSON.parse(JSON.stringify(require(`./${filename}`)));
}

module.exports = { getFile };
