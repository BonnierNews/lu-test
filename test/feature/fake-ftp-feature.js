import { expect } from "chai";
import ftp from "basic-ftp";
import { Readable } from "stream";
import buffer from "buffer";

import * as fakeFTP from "../helpers/fake-ftp.js";

const expectedExports = [ "connectionError", "put", "putError", "putMany", "reset", "written" ];

describe("fake-ftp exposed features", () => {
  describe("Importing default export", () => {
    it("The right stuff gets exposed", () => {
      expect(Object.keys(fakeFTP).sort().join(",")).to.equal(expectedExports.sort().join(","));
    });
  });
});

const ftpConfig = {
  host: "some-host",
  port: "21",
  user: "some-user",
  password: "password",
  secure: false,
};
const path = "/some-path";
const data = "some data";

Feature("fake-ftp feature", () => {
  beforeEachScenario(fakeFTP.reset);

  Scenario("successfully fake a connection error", () => {
    Given("there is a connection error", () => {
      fakeFTP.connectionError();
    });
    let response;
    When("trying to connect to an ftp", async () => {
      const client = new ftp.Client();
      try {
        await client.access(ftpConfig);
      } catch (error) {
        response = error;
      }
    });
    Then("the ftp connection should fail", () => {
      response.message.should.eql("ftp connection failed");
    });
  });

  Scenario("successfully fake putting a file", () => {
    Given("we fake putting to some path", () => {
      fakeFTP.put(path);
    });
    let client;
    And("we can connect to an ftp", async () => {
      client = new ftp.Client();
      try {
        await client.access(ftpConfig);
      } catch (error) {
        console.error(error); // eslint-disable-line no-console
      }
    });
    When("uploading some data to the ftp", async () => {
      const content = Readable.from(data);
      await client.uploadFrom(content, path);
    });
    Then("the data should have been written", () => {
      fakeFTP.written(path).should.eql(data);
    });
  });

  Scenario("successfully fake putting a file as a buffer", () => {
    Given("we fake putting to some path", () => {
      fakeFTP.put(path);
    });
    let client;
    And("we can connect to an ftp", async () => {
      client = new ftp.Client();
      try {
        await client.access(ftpConfig);
      } catch (error) {
        console.error(error); // eslint-disable-line no-console
      }
    });
    When("uploading some data to the ftp", async () => {
      const content = Readable.from(Buffer.from(data));
      await client.uploadFrom(content, path);
    });
    Then("the data should have been written", () => {
      fakeFTP.written(path).should.eql(data);
    });
  });

  Scenario("successfully fake putting a file as a buffer with encoding", () => {
    const specialData = "some ä å ö , . - data";
    const specialDataInLatin1 = buffer.transcode(Buffer.from(specialData), "latin1", "utf8").toString();
    Given("we fake putting to some path", () => {
      fakeFTP.put(path);
    });
    let client;
    And("we can connect to an ftp", async () => {
      client = new ftp.Client();
      try {
        await client.access(ftpConfig);
      } catch (error) {
        console.error(error); // eslint-disable-line no-console
      }
    });
    When("uploading some data to the ftp", async () => {
      const content = Readable.from(Buffer.from(specialData));
      await client.uploadFrom(content, path);
    });
    Then("the data should have been written", () => {
      fakeFTP.written(path, { encoding: "latin1" }).should.eql(specialDataInLatin1);
    });
  });

  Scenario("successfully fake putting a couple of files", () => {
    const otherPath = "/some-other-path";
    const otherData = "some other data";
    Given("we fake putting to two different paths", () => {
      fakeFTP.putMany([ path, otherPath ]);
    });
    let client;
    And("we can connect to an ftp", async () => {
      client = new ftp.Client();
      try {
        await client.access(ftpConfig);
      } catch (error) {
        console.error(error); // eslint-disable-line no-console
      }
    });
    When("uploading some data to the ftp", async () => {
      const content = Readable.from(data);
      await client.uploadFrom(content, path);
    });
    Then("the data should have been written", () => {
      fakeFTP.written(path).should.eql(data);
    });
    When("uploading some data to the ftp in another path", async () => {
      const content = Readable.from(otherData);
      await client.uploadFrom(content, otherPath);
    });
    Then("the data should have been written", () => {
      fakeFTP.written(otherPath).should.eql(otherData);
    });
  });

  Scenario("successfully fake an upload error", () => {
    Given("we fake an error while putting to some path", () => {
      fakeFTP.putError();
    });
    let client;
    And("we can connect to an ftp", async () => {
      client = new ftp.Client();
      try {
        await client.access(ftpConfig);
      } catch (error) {
        console.error(error); // eslint-disable-line no-console
      }
    });
    let response;
    When("uploading some data to the ftp", async () => {
      try {
        const content = Readable.from(data);
        await client.uploadFrom(content, path);
      } catch (error) {
        response = error;
      }
    });
    Then("we should receive an error that the put failed", () => {
      response.message.should.eql("ftp put failed");
    });
  });
});
