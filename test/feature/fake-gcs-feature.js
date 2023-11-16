import { Storage } from "@google-cloud/storage";
import stream from "stream";
import { promisify } from "util";
import assert from "assert";
import config from "exp-config";

import * as fakeGcs from "../helpers/fake-gcs.js";

const pipeline = promisify(stream.pipeline);

const filePath = "gs://some-bucket/dir/file.txt";

Feature("fake-gcs feature", () => {
  beforeEachScenario(fakeGcs.reset);
  Scenario("Write a file to google", () => {
    Given("there's a target we can write to", () => {
      fakeGcs.mockFile(filePath);
    });

    When("we write the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const writeStream = storage
        .bucket("some-bucket")
        .file("dir/file.txt")
        .createWriteStream();

      const readStream = new stream.Readable();
      readStream.push("some text\n");
      readStream.push(null);
      await pipeline(readStream, writeStream);
    });

    Then("we should have cached a written file", () => {
      fakeGcs.written(filePath).should.eql("some text\n");
    });
  });

  Scenario("Write a large file to google", () => {
    Given("there's a target we can write to", () => {
      fakeGcs.mockFile(filePath);
    });

    When("we write the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const writeStream = storage
        .bucket("some-bucket")
        .file("dir/file.txt")
        .createWriteStream();

      const readStream = new stream.Readable();
      for (let index = 0; index < 1000; index++) {
        readStream.push("some text\n");
      }
      readStream.push(null);
      await pipeline(readStream, writeStream);
    });

    Then("we should have cached a written file", () => {
      fakeGcs.written(filePath).should.include("some text\n");
      fakeGcs.written(filePath).length.should.eql(10000);
    });
  });

  Scenario("Write multiple files to google", () => {
    const filePath1 = "gs://some-bucket/dir/file_1.txt";
    const filePath2 = "gs://some-bucket/dir/file_2.txt";

    Given("there's two targets we can write to", () => {
      fakeGcs.mockFile(filePath1);
      fakeGcs.mockFile(filePath2);
    });

    When("we write to file1's path", async () => {
      const storage = new Storage(config.gcs.credentials);
      const fileOne = storage
        .bucket("some-bucket")
        .file("dir/file_1.txt")
        .createWriteStream();
      const readStream = new stream.Readable();
      readStream.push("some text\n");
      readStream.push(null);
      await pipeline(readStream, fileOne);
    });

    And("we write to file2's path", async () => {
      const storage = new Storage(config.gcs.credentials);
      const writeStream = storage
        .bucket("some-bucket")
        .file("dir/file_2.txt")
        .createWriteStream();

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

  Scenario("Read multiple files from google", () => {
    Given("there's two readable files", () => {
      fakeGcs.mockFile("gs://some-bucket/dir/file_1.txt", { content: "some stuff\n" });
      fakeGcs.mockFile("gs://some-bucket/dir/file_2.txt", { content: "some other stuff\n" });
    });

    const readOne = [];
    When("we try to read the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const readStream = storage
        .bucket("some-bucket")
        .file("dir/file_1.txt")
        .createReadStream();

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
      const readStream = storage
        .bucket("some-bucket")
        .file("dir/file_2.txt")
        .createReadStream();

      await pipeline(readStream, async function* (iterable) {
        for await (const data of iterable) {
          readTwo.push(data);
          yield;
        }
      });
    });

    Then(
      "we should have read 'some stuff\\n' and 'some other stuff\\n'",
      () => {
        readOne.join("").should.eql("some stuff\n");
        readTwo.join("").should.eql("some other stuff\n");
      }
    );
  });

  Scenario("Read the same file multiple times from google", () => {
    Given("there's two readable files", () => {
      fakeGcs.mockFile("gs://some-bucket/dir/file_1.txt", { content: "some stuff\n" });
    });

    const readOne = [];
    When("we try to read the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const readStream = storage
        .bucket("some-bucket")
        .file("dir/file_1.txt")
        .createReadStream();

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
      const readStream = storage
        .bucket("some-bucket")
        .file("dir/file_1.txt")
        .createReadStream();

      await pipeline(readStream, async function* (iterable) {
        for await (const data of iterable) {
          readTwo.push(data);
          yield;
        }
      });
    });

    Then(
      "we should have read 'some stuff\\n' and 'some other stuff\\n'",
      () => {
        readOne.join("").should.eql("some stuff\n");
        readTwo.join("").should.eql("some stuff\n");
      }
    );
  });

  Scenario("Read a file with specific encoding from google", () => {
    Given("there's two readable files", () => {
      const content = Buffer.from("tést", "latin1");// .toString("latin1");
      fakeGcs.mockFile("gs://some-bucket/dir/file_1.txt", { content, encoding: "latin1" });
    });

    const readOne = [];
    When("we try to read the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      const readStream = storage
        .bucket("some-bucket")
        .file("dir/file_1.txt")
        .createReadStream();

      await pipeline(readStream, async function* (iterable) {
        for await (const data of iterable) {
          readOne.push(data);
          yield;
        }
      });
    });

    Then(
      "we should have read 'tést'",
      () => {
        readOne.join("").should.eql("tést");
        // Buffer.from(readOne.join("")).toString("utf-8").should.eql("tést");
      }
    );
  });

  Scenario("Get a files metadata from google", () => {
    Given("there's two readable files", () => {
      fakeGcs.mockFile("gs://some-bucket/dir/file_1.csv", { content: "some,csv,file\n" });
    });

    let metadata;
    When("we try to read the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      metadata = await storage
        .bucket("some-bucket")
        .file("dir/file_1.txt")
        .getMetadata();
    });

    Then("we should have got some metadata", () => {
      metadata.should.eql({
        contentEncoding: "utf-8",
        contentType: "text/csv",
        name: "file_1.csv",
        size: 14,
      });
    });
  });

  Scenario("Delete a file in google", () => {
    Given("there's two readable files", () => {
      fakeGcs.mockFile("gs://some-bucket/dir/file_1.csv", { content: "some,csv,file\n" });
    });

    When("we try to read the file", async () => {
      const storage = new Storage(config.gcs.credentials);
      await storage
        .bucket("some-bucket")
        .file("dir/file_1.txt")
        .delete();
    });

    let files;
    Then("we list files", async () => {
      const storage = new Storage(config.gcs.credentials);
      files = await storage
        .bucket("some-bucket")
        .getFiles("dir/");
    });

    And("we should have no files", () => {
      files.length.should.eql(0);
    });
  });

  Scenario("Check if a file exists on google with readable data", () => {
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

  Scenario("The stream throws an error", () => {
    Given("there's a mocked file with readable data", () => {
      fakeGcs.mockFile(filePath, { content: "blahoga\n" }).throws(new Error("some error"));
    });

    When("we ask if the file exists", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /some error/);
    });
  });

  Scenario("Check if a file exists on google without readable data", () => {
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

  Scenario("Ask for a list of files with a prefix", () => {
    Given("there's a mocked file", () => {
      fakeGcs.mockFile(filePath);
    });

    let files;
    When("we ask ask for a list of files", () => {
      const storage = new Storage(config.gcs.credentials);
      files = storage
        .bucket("some-bucket")
        .getFiles({ prefix: "dir/" });
    });

    Then("we verify that there is just one", () => {
      files.should.eql([ filePath ]);
    });
  });

  Scenario("Mock the same file twice", () => {
    When("there's a mock", () => {
      fakeGcs.mockFile(filePath);
    });

    Then("when we try to mock the file again, it throws an error", () => {
      assert.throws(
        () => fakeGcs.mockFile(filePath),
        /has already been mocked/
      );
    });
  });

  Scenario("Mock with the wrong bucket", () => {
    When("we try to mock the file, it throws an error", () => {
      assert.throws(
        () => fakeGcs.mockFile("gs://some-other-bucket/dir/file.txt"),
        /Invalid gcs bucket some-other-bucket/
      );
    });
  });
});
