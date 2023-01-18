"use strict";

const { parse } = require("csv-parse/sync");

function jsonLinesToObjectArray(content) {
  return content
    .split("\n")
    .filter((row) => Boolean(row))
    .map((row) => JSON.parse(row));
}

function objectArrayToJsonLines(content) {
  return `${content.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

function csvToJsonLines(str) {
  if (!str) return;
  const objectArray = parse(str, { delimiter: ",", columns: true, relax_column_count: true }); // eslint-disable-line camelcase
  return objectArrayToJsonLines(objectArray);
}

module.exports = { jsonLinesToObjectArray, objectArrayToJsonLines, csvToJsonLines };
