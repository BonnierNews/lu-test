import { expect } from "chai";

import * as fileUtils from "../helpers/file-utils.js";

const expectedExports = [ "csvToJsonLines", "jsonLinesToObjectArray", "objectArrayToJsonLines", "modifyFile" ];

describe("file-utils exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fileUtils).sort().join(",")).to.equal(expectedExports.sort().join(","));
    });
  });
});

const csv = `header1,header2
col1,
colA,colB
`;
const array = [
  { header1: "col1", header2: "" },
  { header1: "colA", header2: "colB" },
];
const jsonLines = `${array.map(JSON.stringify).join("\n")}\n`;

Feature("file-utils feature", () => {
  Scenario("successfully convert JSON lines to an array", () => {
    let response;
    When("converting JSON lines to an array", () => {
      response = fileUtils.jsonLinesToObjectArray(jsonLines);
    });
    Then("we should have received an object array", () => {
      response.should.eql(array);
    });
  });

  Scenario("successfully convert a csv to JSON lines", () => {
    let response;
    When("converting a csv to JSON lines", () => {
      response = fileUtils.csvToJsonLines(csv);
    });
    Then("we should have received two JSON lines", () => {
      response.should.eql(jsonLines);
    });
  });

  Scenario("successfully convert an empty to nothing", () => {
    let response;
    When("converting nothing to JSON lines", () => {
      response = fileUtils.csvToJsonLines();
    });
    Then("we should have received nothing", () => {
      should.not.exist(response);
    });
  });

  Scenario("successfully modify file data", () => {
    let response;
    When("converting JSON lines to an array", () => {
      response = fileUtils.modifyFile(jsonLines, (row) => row.header1);
    });
    Then("we should have received a list with only headers", () => {
      const expectedData = array
        .map((row) => {
          return `"${row.header1}"`;
        })
        .join("\n");
      response.should.eql(`${expectedData}\n`);
    });
  });
});
