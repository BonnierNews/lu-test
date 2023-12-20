import { Storage } from "@google-cloud/storage";
import stream from "stream";
import { promisify } from "util";
import assert from "assert";
import config from "exp-config";

import * as fakeGcs from "../helpers/fake-gcs.js";

const pipeline = promisify(stream.pipeline);

const filePath = "gs://some-bucket/dir/file.txt";

Feature("fake-gcs alternative api feature", () => {
  beforeEachScenario(fakeGcs.reset);
  Scenario("Write a file to google", () => {
    Given("there's a target we can write to", () => {
      fakeGcs.write(filePath);
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

  Scenario("Read multiple files from google", () => {
    Given("there's two readable files", () => {
      fakeGcs.read("gs://some-bucket/dir/file_1.txt", "some stuff\n");
      fakeGcs.read("gs://some-bucket/dir/file_2.txt", "some other stuff\n");
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

  Scenario("Read the same file multiple times from google", () => {
    Given("there's a readable file", () => {
      fakeGcs.read("gs://some-bucket/dir/file_1.txt", "some stuff\n");
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
    And("we try reading it again", async () => {
      const storage = new Storage(config.gcs.credentials);
      const readStream = storage.bucket("some-bucket").file("dir/file_1.txt").createReadStream();

      await pipeline(readStream, async function* (iterable) {
        for await (const data of iterable) {
          readTwo.push(data);
          yield;
        }
      });
    });

    Then("we should have read 'some stuff\\n' twice", () => {
      readOne.join("").should.eql("some stuff\n");
      readTwo.join("").should.eql("some stuff\n");
    });
  });

  Scenario("Write to one file, read from the other", () => {
    Given("there's an existing file and", () => {
      fakeGcs.read("gs://some-bucket/dir/file_1.txt", "some stuff\n");
      fakeGcs.write("gs://some-bucket/dir/file_2.txt");
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

    Then("we should have read 'some stuff\\n'", () => {
      readOne.join("").should.eql("some stuff\n");
    });

    let fileTwoExists;
    When("we check if the second file exists", async () => {
      const storage = new Storage(config.gcs.credentials);
      const exists = await storage.bucket("some-bucket").file("dir/file_2.txt").exists();

      fileTwoExists = exists[0];
    });

    Then("it should not exist", () => {
      fileTwoExists.should.eql(false);
    });

    When("we write to file two", async () => {
      const storage = new Storage(config.gcs.credentials);
      const writeStream = await storage.bucket("some-bucket").file("dir/file_2.txt").createWriteStream();

      const readStream = new stream.Readable();
      readStream.push("some other text\n");
      readStream.push(null);
      await pipeline(readStream, writeStream);
    });

    const readTwo = [];
    Then("we should be able to read file two", async () => {
      const storage = new Storage(config.gcs.credentials);
      const readStream = await storage.bucket("some-bucket").file("dir/file_2.txt").createReadStream();

      await pipeline(readStream, async function* (iterable) {
        for await (const data of iterable) {
          readTwo.push(data);
          yield;
        }
      });
    });

    And("we should have read 'some other text\\n'", () => {
      readTwo.join("").should.eql("some other text\n");
    });
  });

  Scenario("Read two different files in two buckets from google", () => {
    Given("there's two readable files", () => {
      fakeGcs.read("gs://some-bucket/dir/file_1.txt", "some stuff\n");
      fakeGcs.read("gs://some-other-bucket/dir/file_1.txt", "some other stuff\n");
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
      const readStream = storage.bucket("some-other-bucket").file("dir/file_1.txt").createReadStream();

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

  Scenario("Read a file with specific encoding from google", () => {
    Given("there's two readable files", () => {
      const content = Buffer.from("tést", "latin1");
      fakeGcs.read("gs://some-bucket/dir/file_1.txt", content, { encoding: "latin1" });
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

    Then("we should have read 'tést'", () => {
      readOne.join("").should.eql("tést");
    });
  });

  Scenario("Check if a file exists on google with readable data", () => {
    Given("there's a mocked file with readable data", () => {
      fakeGcs.read(filePath, "blahoga\n");
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

  Scenario("The write stream throws an error", () => {
    Given("there's a mocked file with an error", () => {
      fakeGcs.writeError(filePath);
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /gcs file stream error/);
    });
  });

  Scenario("The write stream throws a specified error", () => {
    Given("there's a mocked file with a specified error", () => {
      fakeGcs.writeError(filePath, "some error");
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /some error/);
    });
  });

  Scenario("The read stream throws an error", () => {
    Given("there's a mocked file with an error", () => {
      fakeGcs.readError(filePath);
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /gcs file stream read error/);
    });
  });

  Scenario("The read stream throws a specified error", () => {
    Given("there's a mocked file with a specified error", () => {
      fakeGcs.readError(filePath, "some error");
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /some error/);
    });
  });

  Scenario("The read path throws an error", () => {
    Given("there's a mocked path with an error", () => {
      fakeGcs.readWithPathError(filePath);
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /gcs file stream read error/);
    });
  });

  Scenario("The read path throws a specified error", () => {
    Given("there's a mocked path with a specified error", () => {
      fakeGcs.readWithPathError(filePath, "some error");
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /some error/);
    });
  });

  Scenario("Check if a file exists on google without readable data", () => {
    Given("the file doesn't exist", () => {
      fakeGcs.exists(filePath, false);
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

  Scenario("Check if a file exists on google with readable data", () => {
    Given("the file exists", () => {
      fakeGcs.exists(filePath, true);
    });

    let exists;
    When("we ask if the file exists", () => {
      const storage = new Storage(config.gcs.credentials);
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
    });

    Then("we verify that it does exist", () => {
      exists.should.eql([ true ]);
    });
  });

  Scenario("Check if multiple files exists on google", () => {
    Given("a file without readable data", () => {
      fakeGcs.exists("gs://some-bucket/dir/file_1.txt", false);
    });

    And("a file with readable data", () => {
      fakeGcs.exists("gs://some-bucket/dir/file_2.txt", true);
    });

    And("two more files without readable data", () => {
      fakeGcs.exists("gs://some-other-bucket/dir/file_1.txt", false);
      fakeGcs.exists("gs://some-other-bucket/dir/file_2.txt", false);
    });

    let storage;
    And("we can access the bucket", () => {
      storage = new Storage(config.gcs.credentials);
    });

    And("we write the fourth file", async () => {
      const writeStream = storage.bucket("some-other-bucket").file("dir/file_2.txt").createWriteStream();
      const readStream = new stream.Readable();
      readStream.push("some other text\n");
      readStream.push(null);
      await pipeline(readStream, writeStream);
    });

    let existsOne, existsTwo, existsThree, existsFour;
    When("we ask if the files exist", () => {
      existsOne = storage.bucket("some-bucket").file("dir/file_1.txt").exists();
      existsTwo = storage.bucket("some-bucket").file("dir/file_2.txt").exists();
      existsThree = storage.bucket("some-other-bucket").file("dir/file_1.txt").exists();
      existsFour = storage.bucket("some-other-bucket").file("dir/file_2.txt").exists();
    });

    Then("the first and third files shouldn't exist", () => {
      existsOne.should.eql([ false ]);
      existsThree.should.eql([ false ]);
    });

    And("the second and fourth files should exist", () => {
      existsTwo.should.eql([ true ]);
      existsFour.should.eql([ true ]);
    });
  });

  Scenario("Check if a file exists on google with readable data - first it doesn't, then it does", () => {
    Given("the file doesn't exist twice and then it does", () => {
      fakeGcs.exists(filePath, [ false, false, true ]);
    });

    let exists;
    const storage = new Storage(config.gcs.credentials);
    When("we ask if the file exists", () => {
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
    });

    Then("we verify that it doesn't exist", () => {
      exists.should.eql([ false ]);
    });

    When("we ask if the file exists a second time", () => {
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
    });

    Then("we verify that it doesn't exist", () => {
      exists.should.eql([ false ]);
    });

    When("we ask if the file exists a third time", () => {
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
    });

    Then("we verify that it does exist", () => {
      exists.should.eql([ true ]);
    });
  });

  Scenario("Trying to fake that a file exists on google using bad status", () => {
    let error;
    When("we try to fake that the file exists the wrong way", () => {
      try {
        fakeGcs.exists(filePath, "true");
      } catch (err) {
        error = err;
      }
    });

    Then("we should get an error", () => {
      error.message.should.eql("expected fileExists to be a boolean or an array");
    });
  });

  Scenario("Check if file exists throws an error", () => {
    Given("there's a mocked path with an error", () => {
      fakeGcs.existsError(filePath);
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /gcs file stream exists error/);
    });
  });

  Scenario("Check if file exists throws a specified error", () => {
    Given("there's a mocked path with a specified error", () => {
      fakeGcs.existsError(filePath, "some error");
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /some error/);
    });
  });

  Scenario("Check if a file exists on google with readable data - using multiple calls function", () => {
    Given("the file doesn't exist twice and then it does", () => {
      fakeGcs.existsMultipleCalls(filePath, [ false, false, true ]);
    });

    let exists;
    const storage = new Storage(config.gcs.credentials);
    When("we ask if the file exists", () => {
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
    });

    Then("we verify that it doesn't exist", () => {
      exists.should.eql([ false ]);
    });

    When("we ask if the file exists a second time", () => {
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
    });

    Then("we verify that it doesn't exist", () => {
      exists.should.eql([ false ]);
    });

    When("we ask if the file exists a third time", () => {
      exists = storage.bucket("some-bucket").file("dir/file.txt").exists();
    });

    Then("we verify that it does exist", () => {
      exists.should.eql([ true ]);
    });
  });

  Scenario("Trying to fake that a file exists on google using bad status - using multiple calls function", () => {
    let error;
    When("we try to fake that the file exists the wrong way", () => {
      try {
        fakeGcs.existsMultipleCalls(filePath, true);
      } catch (err) {
        error = err;
      }
    });

    Then("we should get an error", () => {
      error.message.should.eql("expected fileExistsArr to be an array");
    });
  });

  Scenario("Ask for a list of files with a prefix", () => {
    Given("there's a mocked list of files", () => {
      const path = filePath.split("/").slice(0, 4).join("/");
      const file1 = filePath.split("/").pop();
      fakeGcs.list(path, [ file1 ]);
    });

    let files;
    When("we ask ask for a list of files", () => {
      const storage = new Storage(config.gcs.credentials);
      files = storage.bucket("some-bucket").getFiles({ prefix: "dir/" });
    });

    Then("we verify that there is just one", () => {
      files.should.eql([ filePath ]);
    });
  });

  Scenario("Listing files throws an error", () => {
    Given("there's a mocked path with an error", () => {
      fakeGcs.listError(filePath);
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /gcs list error/);
    });
  });

  Scenario("Listing files throws a specified error", () => {
    Given("there's a mocked path with a specified error", () => {
      fakeGcs.listError(filePath, "some error");
    });

    When("we try to access the storage", () => {
      const storage = new Storage(config.gcs.credentials);
      assert.throws(() => {
        storage.bucket("some-bucket").file("dir/file.txt");
      }, /some error/);
    });
  });

  Scenario("Mock the same file twice", () => {
    When("there's a mock", () => {
      fakeGcs.write(filePath);
    });

    Then("when we try to mock the file again, it throws an error", () => {
      assert.throws(() => fakeGcs.write(filePath), /has already been mocked/);
    });
  });
});
