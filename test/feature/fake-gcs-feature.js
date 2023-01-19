"use strict";

const fakeGcs = require("../helpers/fake-gcs");
const stream = require("stream");
const { promisify } = require("util");
const pipeline = promisify(stream.pipeline);
const config = require("exp-config");
const { Storage } = require("@google-cloud/storage");

Feature("fake-gcs feature", () => {
  beforeEachScenario(fakeGcs.reset);
  Scenario("we can pretend to write files to google", () => {
    const filePath = "gs://some-bucket/dir/file.txt";
    Given("there's a target we can write to", () => {
      fakeGcs.mockFile(filePath);
    });
    When("we write the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const writeStream = storage.bucket("some-bucket").file("/dir/file.txt").createWriteStream();

      const readStream = new stream.Readable();
      readStream.push("blahoga\n");
      readStream.push(null);
      await pipeline(readStream, writeStream);
    });
    Then("we should have cached a written file", () => {
      fakeGcs.written(filePath).should.eql("blahoga\n");
    });
  });

  Scenario("we can pretend to read files from google", () => {
    const filePath = "gs://some-bucket/dir/file.txt";
    Given("there's a target we can write to", () => {
      fakeGcs.mockFile(filePath, { readableData: "blahoga\n" });
    });
    const arr = [];
    When("we try to read the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const readStream = storage.bucket("some-bucket").file("/dir/file.txt").createReadStream();

      await pipeline(readStream, async function* (iterable) {
        for await (const data of iterable) {
          arr.push(data);
          yield;
        }
      });
    });

    Then("we should have read 'blahoga\\n'", () => {
      arr.join("").should.eql("blahoga\n");
    });
  });

  Scenario("we can pretend to check if a file exists on google with readable data", () => {
    const filePath = "gs://some-bucket/dir/file.txt";
    Given("there's a mocked file with readable data", () => {
      fakeGcs.mockFile(filePath, { readableData: "blahoga\n" });
    });
    let exists;
    When("we ask if the file exists", () => {
      const storage = new Storage(config.gcs.credentials);
      exists = storage.bucket("some-bucket").file("/dir/file.txt").exists();
    });

    Then("we verify that it exists", () => {
      exists.should.eql([ true ]);
    });
  });

  Scenario("we can pretend to check if a file exists on google without readable data", () => {
    const filePath = "gs://some-bucket/dir/file.txt";
    Given("there's a mocked file without readable data", () => {
      fakeGcs.mockFile(filePath);
    });
    let exists;
    When("we ask if the file exists", () => {
      const storage = new Storage(config.gcs.credentials);
      exists = storage.bucket("some-bucket").file("/dir/file.txt").exists();
    });

    Then("we verify that it does not exist", () => {
      exists.should.eql([ false ]);
    });
  });

  Scenario("we can pretend to ask for a list of files with a prefix", () => {
    const filePath = "gs://some-bucket/dir/file.txt";
    Given("there's a mocked file", () => {
      fakeGcs.mockFile(filePath);
    });
    let files;
    When("we ask ask for a list of files", () => {
      const storage = new Storage(config.gcs.credentials);
      files = storage.bucket("some-bucket").file("/dir/file.txt").getFiles({ prefix: "dir/" });
    });

    Then("we verify that there is just one", () => {
      files.should.eql([ filePath ]);
    });
  });
});
