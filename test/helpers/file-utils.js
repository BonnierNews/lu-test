import { parse } from "csv-parse/sync"; // eslint-disable-line import/no-unresolved

export function jsonLinesToObjectArray(content) {
  return content
    .split("\n")
    .filter((row) => Boolean(row))
    .map((row) => JSON.parse(row));
}

export function objectArrayToJsonLines(content) {
  return `${content.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

export function csvToJsonLines(str) {
  if (!str) return;
  const objectArray = parse(str, {
    delimiter: ",",
    columns: true,
    relax_column_count: true,
  }); // eslint-disable-line camelcase
  return objectArrayToJsonLines(objectArray);
}
