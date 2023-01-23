"use strict";

const { Storage } = require("@google-cloud/storage");
const stream = require("stream");
const { promisify } = require("util");

const config = require("exp-config");
const fakeGcs = require("../helpers/fake-gcs");
const pipeline = promisify(stream.pipeline);

Feature("fake-gcs feature", () => {
  beforeEachScenario(fakeGcs.reset);
  Scenario("we can pretend to write files to google", () => {
    const filePath = "gs://some-bucket/dir/file.txt";
    Given("there's a target we can write to", () => {
      fakeGcs.mockFile(filePath);
    });
    When("we write the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const writeStream = storage.bucket("some-bucket").file("dir/file.txt").createWriteStream();

      const readStream = new stream.Readable();
      readStream.push("some text\n");
      readStream.push(null);
      await pipeline(readStream, writeStream);
    });
    Then("we should have cached a written file", () => {
      fakeGcs.written(filePath).should.eql("some text\n");
    });
  });

  Scenario("we can pretend to write multiple files to google", () => {
    const filePath1 = "gs://some-bucket/dir/file_1.txt";
    const filePath2 = "gs://some-bucket/dir/file_2.txt";
    Given("there's two targets we can write to", () => {
      fakeGcs.mockFile(filePath1);
      fakeGcs.mockFile(filePath2);
    });
    When("we write to file1's path", async () => {
      const storage = new Storage(config.gcs.credentials);
      const fileOne = storage.bucket("some-bucket").file("dir/file_1.txt").createWriteStream();
      const readStream = new stream.Readable();
      readStream.push("some text\n");
      readStream.push(null);
      await pipeline(readStream, fileOne);
    });

    And("we write to file2's path", async () => {
      const storage = new Storage(config.gcs.credentials);
      const writeStream = storage.bucket("some-bucket").file("dir/file_2.txt").createWriteStream();

      const readStream = new stream.Readable();
      readStream.push("some other text\n");
      readStream.push(null);
      await pipeline(readStream, writeStream);
    });

    Then("we should have cached two files that have been written", () => {
      fakeGcs.written(filePath1).should.eql("some text\n");
      fakeGcs.written(filePath2).should.eql("some other text\n");
    });
  });

  Scenario("we can pretend to read multiple files from google", () => {
    Given("there's two readable files", () => {
      fakeGcs.mockFile("gs://some-bucket/dir/file_1.txt", { content: "some stuff\n" });
      fakeGcs.mockFile("gs://some-bucket/dir/file_2.txt", { content: "some other stuff\n" });
    });
    const readOne = [];
    When("we try to read the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const readStream = storage.bucket("some-bucket").file("dir/file_1.txt").createReadStream();

      await pipeline(readStream, async function* (iterable) {
        for await (const data of iterable) {
          readOne.push(data);
          yield;
        }
      });
    });

    const readTwo = [];
    And("we try reading another one", async () => {
      const storage = new Storage(config.gcs.credentials);
      const readStream = storage.bucket("some-bucket").file("dir/file_2.txt").createReadStream();

      await pipeline(readStream, async function* (iterable) {
        for await (const data of iterable) {
          readTwo.push(data);
          yield;
        }
      });
    });

    Then("we should have read 'some stuff\\n' and 'some other stuff\\n'", () => {
      readOne.join("").should.eql("some stuff\n");
      readTwo.join("").should.eql("some other stuff\n");
    });
  });

  Scenario("we can pretend to check if a file exists on google with readable data", () => {
    const filePath = "gs://some-bucket/dir/file.txt";
    Given("there's a mocked file with readable data", () => {
      fakeGcs.mockFile(filePath, { content: "blahoga\n" });
    });
    let exists;
    When("we ask if the file exists", () => {
      const storage = new Storage(config.gcs.credentials);
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
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
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
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
      files = storage.bucket("some-bucket").file("dir/file.txt").getFiles({ prefix: "dir/" });
    });

    Then("we verify that there is just one", () => {
      files.should.eql([ filePath ]);
    });
  });
});
