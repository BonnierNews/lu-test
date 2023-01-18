"use strict";

function parsedPDF(pdfJSON) {
  const dateRegex = /(([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))%20([01]\d|2[0-3])%3A[0-5]\d%3A[0-5]\d)/g;
  let i = 1;
  return pdfJSON.Pages.map((page) => {
    let j = 0;
    const pageRows = page.Texts.reduce((rows, text) => {
      const thisRow = text.y < 0 ? "0" : text.y.toString();
      if (!rows[thisRow]) rows[thisRow] = [];
      rows[thisRow].push(text.R[0].T.match(dateRegex) ? null : decodeURIComponent(text.R[0].T));
      return rows;
    }, {});
    return {
      pageNumber: i++,
      layout: [ 49.5, 52.618 ].includes(page.Height) ? "portrait" : "landscape",
      page: Object.keys(pageRows).map((row) => {
        return { rowNumber: j++, columns: pageRows[row] };
      }),
    };
  });
}

module.exports = { parsedPDF };
