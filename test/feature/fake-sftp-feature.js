import { expect } from "chai";
import SftpClient from "ssh2-sftp-client";
import { Readable, Writable } from "stream";

import * as fakeSftp from "../helpers/fake-sftp.js";

const expectedExports = [
  "connectionError",
  "copy",
  "exists",
  "getAsStream",
  "getManyAsStream",
  "getTargetPath",
  "list",
  "listMany",
  "put",
  "putError",
  "putMany",
  "remove",
  "removed",
  "reset",
  "written",
  "writtenAsBuffer",
];

describe("fake-sftp exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fakeSftp).sort().join(",")).to.equal(expectedExports.sort().join(","));
    });
  });
});

const sftpConfig = {
  host: "some-host",
  port: "22",
  username: "some-user",
  password: "password",
};
const path = "/some-path";
const data = "some data";
const file = "file1";
const otherPath = "/some-other-path";
const otherData = "some other data";
const otherFile = "file2";
const files = [ file, otherFile ];
const filePattern = (fileName) => fileName.match("file");
const filePatternRegExp = (fileName) => fileName.match(/file/);

Feature("fake-sftp connection error feature", () => {
  beforeEachScenario(fakeSftp.reset);

  Scenario("successfully fake a connection error", () => {
    Given("there is a connection error", () => {
      fakeSftp.connectionError();
    });
    let response;
    When("trying to connect to an sftp", async () => {
      const client = new SftpClient();
      try {
        await client.connect(sftpConfig);
      } catch (error) {
        response = error;
      }
    });
    Then("the sftp connection should fail", () => {
      response.message.should.eql("sftp connection failed");
    });
  });
});

Feature("fake-sftp exists feature", () => {
  beforeEachScenario(fakeSftp.reset);

  Scenario("successfully fake a file existing", () => {
    Given("we fake some path existing", () => {
      fakeSftp.exists(path, true);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let response;
    When("checking if the path exists", async () => {
      response = await client.exists(path);
    });
    Then("the path should exist", () => {
      response.should.eql(true);
    });
  });
});

Feature("fake-sftp put feature", () => {
  beforeEachScenario(fakeSftp.reset);

  Scenario("successfully fake putting a file", () => {
    Given("we fake putting to some path", () => {
      fakeSftp.put(path);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    When("uploading some data to the sftp", async () => {
      const content = Readable.from(data);
      await client.put(content, path);
    });
    Then("the data should have been written", () => {
      fakeSftp.written(path).should.eql(data);
    });
    And("we can get the data as a buffer too", () => {
      fakeSftp.writtenAsBuffer(path).toString().should.eql(data);
    });
    And("the targetPath should be the expected", () => {
      fakeSftp.getTargetPath().should.eql(path);
    });
  });

  Scenario("successfully fake putting a file as a buffer", () => {
    Given("we fake putting to some path", () => {
      fakeSftp.put(path);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    When("uploading some data to the sftp", async () => {
      const content = Readable.from(Buffer.from(data));
      await client.put(content, path);
    });
    Then("the data should have been written", () => {
      fakeSftp.written(path).should.eql(data);
    });
    And("we can get the data as a buffer too", () => {
      fakeSftp.writtenAsBuffer(path).toString().should.eql(data);
    });
  });

  Scenario("successfully fake putting a couple of files", () => {
    Given("we fake putting to two different paths", () => {
      fakeSftp.putMany([ path, otherPath ]);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    When("uploading some data to the sftp", async () => {
      const content = Readable.from(data);
      await client.put(content, path);
    });
    Then("the data should have been written", () => {
      fakeSftp.written(path).should.eql(data);
    });
    When("uploading some data to the sftp in another path", async () => {
      const content = Readable.from(otherData);
      await client.put(content, otherPath);
    });
    Then("the data should have been written", () => {
      fakeSftp.written(otherPath).should.eql(otherData);
    });
  });

  Scenario("successfully fake an upload error", () => {
    Given("we fake an error while putting to some path", () => {
      fakeSftp.putError();
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let response;
    When("uploading some data to the sftp", async () => {
      try {
        const content = Readable.from(data);
        await client.put(content, path);
      } catch (error) {
        response = error;
      } finally {
        await client.end();
      }
    });
    Then("we should receive an error that the put failed", () => {
      response.message.should.eql("sftp put failed");
    });
  });
});

Feature("fake-sftp get feature", () => {
  beforeEachScenario(fakeSftp.reset);

  Scenario("successfully fake getting a file", () => {
    Given("we fake getting a file", () => {
      fakeSftp.getAsStream(`${path}/${file}`, data);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let response;
    When("getting a file from the sftp", async () => {
      response = await client.get(`${path}/${file}`);
    });
    Then("we should have received the data", () => {
      response.toString().should.eql(data);
    });
    let secondResponse = "";
    When("getting the file from the sftp as a stream", async () => {
      const writeStream = new Writable();

      writeStream._write = (chunk, encoding, next) => {
        secondResponse += chunk.toString();
        next();
      };
      await client.get(`${path}/${file}`, writeStream);
    });
    Then("we should have received the data", () => {
      secondResponse.toString().should.eql(data);
    });
  });

  Scenario("successfully fake getting some files", () => {
    Given("we fake getting some files", () => {
      const expectedFileContent = {};
      expectedFileContent[`${path}/${file}`] = data;
      expectedFileContent[`${otherPath}/${otherFile}`] = data;
      fakeSftp.getManyAsStream(expectedFileContent);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let firstResponse;
    When("getting a file from the sftp", async () => {
      firstResponse = await client.get(`${path}/${file}`);
    });
    Then("we should have received the data", () => {
      firstResponse.toString().should.eql(data);
    });
    let secondResponse = "";
    When("getting the second file from the sftp as a stream", async () => {
      const writeStream = new Writable();

      writeStream._write = (chunk, encoding, next) => {
        secondResponse += chunk.toString();
        next();
      };
      await client.get(`${otherPath}/${otherFile}`, writeStream);
    });
    Then("we should have received the data", () => {
      secondResponse.toString().should.eql(data);
    });
  });
});

Feature("fake-sftp copy feature", () => {
  beforeEachScenario(fakeSftp.reset);

  Scenario("successfully fake copying a file", () => {
    Given("we fake copying some file", () => {
      fakeSftp.copy(path, otherPath, data);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    When("copying the file on the sftp", async () => {
      const sourceBuf = await client.get(path);
      await client.put(sourceBuf, otherPath);
    });
    Then("the data should have been written", () => {
      fakeSftp.written(otherPath).should.eql(data);
    });
  });
});

Feature("fake-sftp delete feature", () => {
  beforeEachScenario(fakeSftp.reset);

  Scenario("successfully fake removing a file", () => {
    Given("we fake removing some path", () => {
      fakeSftp.remove(path);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    When("deleting a file from the sftp", async () => {
      await client.delete(path);
    });
    Then("the file should have been removed", () => {
      fakeSftp.removed(path).should.eql(true);
    });
    let firstResponse;
    When("checking if the file exists", async () => {
      firstResponse = await client.exists(path);
    });
    Then('we should get a "-" back', () => {
      firstResponse.should.eql("-");
    });
    let secondResponse;
    When("checking if another file exists", async () => {
      secondResponse = await client.exists(otherPath);
    });
    Then("the file should not exist", () => {
      secondResponse.should.eql(false);
    });
  });
});

Feature("fake-sftp list feature", () => {
  beforeEachScenario(fakeSftp.reset);

  Scenario("successfully fake listing a path", () => {
    Given("we fake listing some path", () => {
      fakeSftp.list(path, filePattern, files);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let response;
    When("listing a path on the sftp", async () => {
      response = await client.list(path, filePattern);
    });
    Then("the files should be there", () => {
      response.should.eql(files);
    });
  });

  Scenario("successfully fake listing a path, using regexp", () => {
    Given("we fake listing some path", () => {
      fakeSftp.list(path, filePatternRegExp, files);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let response;
    When("listing a path on the sftp", async () => {
      response = await client.list(path, filePatternRegExp);
    });
    Then("the files should be there", () => {
      response.should.eql(files);
    });
  });

  Scenario("successfully fake listing two paths", () => {
    Given("we fake listing some paths", () => {
      fakeSftp.listMany([
        { expectedPath: path, expectedPattern: filePattern, files },
        { expectedPath: otherPath, expectedPattern: filePattern, files },
      ]);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let firstResponse;
    When("listing the first path on the sftp", async () => {
      firstResponse = await client.list(path, filePattern);
    });
    Then("the files should be there", () => {
      firstResponse.should.eql(files);
    });
    let secondResponse;
    When("listing the second path on the sftp", async () => {
      secondResponse = await client.list(otherPath, filePattern);
    });
    Then("the files should be there", () => {
      secondResponse.should.eql(files);
    });
  });

  Scenario("successfully fake listing two paths, using regexp", () => {
    Given("we fake listing some paths", () => {
      fakeSftp.listMany([
        { expectedPath: path, expectedPattern: filePattern, files },
        { expectedPath: otherPath, expectedPattern: filePatternRegExp, files },
      ]);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let firstResponse;
    When("listing the first path on the sftp", async () => {
      firstResponse = await client.list(path, filePattern);
    });
    Then("the files should be there", () => {
      firstResponse.should.eql(files);
    });
    let secondResponse;
    When("listing the second path on the sftp", async () => {
      secondResponse = await client.list(otherPath, filePatternRegExp);
    });
    Then("the files should be there", () => {
      secondResponse.should.eql(files);
    });
  });

  Scenario("unsuccessfully trying to fake listing a path with a pattern instead of a function", () => {
    let response;
    When("we try to fake listing a path with a pattern", () => {
      try {
        fakeSftp.list(path, /something/, files);
      } catch (error) {
        response = error;
      }
    });
    Then("we should get an error about pattern not being a function", () => {
      response.message.should.eql("expected pattern /something/ needs to be a function");
    });
  });

  Scenario("unsuccessfully fake listing a path, pattern doesn't match expected, no matching files", () => {
    Given("we fake listing some path", () => {
      fakeSftp.list(path, filePattern, files);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let response;
    When("listing a path on the sftp", async () => {
      response = await client.list(path, ({ name }) => name === "fish");
    });
    Then("we should get an error about mismatching patterns", () => {
      response.should.eql([]);
    });
  });

  Scenario("unsuccessfully trying to fake listing several paths with a with a pattern instead of a function", () => {
    let response;
    When("we try to fake listing a path with a with a pattern instead of a function", () => {
      try {
        fakeSftp.listMany([ { expectedPath: path, expectedPattern: "/something/", files } ]);
      } catch (error) {
        response = error;
      }
    });
    Then("we should get an error about pattern not being a function", () => {
      response.message.should.eql("expected pattern /something/ needs to be a function");
    });
  });

  Scenario("unsuccessfully fake listing several paths, no files matching", () => {
    Given("we fake listing some path", () => {
      fakeSftp.listMany([ { expectedPath: path, expectedPattern: filePattern, files } ]);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let response;
    When("listing a path on the sftp", async () => {
      response = await client.list(path, ({ name }) => name === "fish");
    });
    Then("we should get an empty array back", () => {
      response.should.eql([]);
    });
  });

  Scenario("unsuccessfully fake listing several paths, pattern doesn't match expected, no files matching", () => {
    Given("we fake listing some path", () => {
      fakeSftp.listMany([ { expectedPath: path, expectedPattern: filePattern, files } ]);
    });
    let client;
    And("we can connect to an sftp", async () => {
      client = new SftpClient();
      await client.connect(sftpConfig);
    });
    let response;
    When("listing a path on the sftp", async () => {
      response = await client.list(path, ({ name }) => name === "fish");
    });
    Then("we should get an empty array back", () => {
      response.should.eql([]);
    });
  });
});
