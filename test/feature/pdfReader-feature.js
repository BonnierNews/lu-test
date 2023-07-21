import { parsedPDF } from "../helpers/pdfReader.js";
import clone from "../helpers/clone.js";
import pdfAsJson from "../data/pdf-as-json.js";
import parsedJson from "../data/parsed-pdf.js";

Feature("pdfReader feature", () => {
  Scenario("successfully parse a pdf in JSON format", () => {
    let response;
    When("parsing the JSON", async () => {
      response = await parsedPDF(pdfAsJson);
    });
    Then("we should have received a usable JSON", () => {
      response.should.eql(parsedJson);
    });
  });

  Scenario("successfully parse a pdf in JSON format in landscape format", () => {
    let response;
    When("parsing the JSON", async () => {
      const landscapePdf = clone(pdfAsJson);
      landscapePdf.Pages[0].Height = 37.205;
      landscapePdf.Pages[0].Width = 52.618;
      response = await parsedPDF(landscapePdf);
    });
    Then("we should have received a usable JSON", () => {
      const landscapeJson = clone(parsedJson);
      landscapeJson[0].layout = "landscape";
      response.should.eql(landscapeJson);
    });
  });
});
