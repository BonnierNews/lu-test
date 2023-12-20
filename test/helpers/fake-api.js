import nock from "nock";
import config from "exp-config";
import stream from "stream";
import zlib from "zlib";
import path from "path";
import fs from "fs";

import clone from "./clone.js";

function init(url = config.gcpProxy?.url || config.proxyUrl || config.awsProxyUrl) {
  let api = nock(url);

  function reset() {
    nock.enableNetConnect();
    nock.cleanAll();
    api = nock(url);
  }

  function disableNetConnect(disableLocalHost = false) {
    nock.disableNetConnect();
    if (!disableLocalHost) {
      nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);
    }
  }

  function mount(testData, times) {
    if (Array.isArray(testData)) {
      return testData.map(mount);
    }
    if (typeof testData === "string") {
      testData = require("test-data")(testData);
    }
    let actualBody;
    const { request } = testData;
    if (request.baseUrl && request.baseUrl !== url) throw new Error(`Mismatching urls ${request.baseUrl} ${url}`);
    const mock = api[request.method.toLowerCase()](request.path, (body) => {
      actualBody = body;
      return true;
    });

    if (times || testData.times) mock.times(times || testData.times);

    if (request.query) {
      mock.query(request.query);
    }

    if (request.headers) {
      for (const [ key, val ] of Object.entries(request.headers)) {
        mock.matchHeader(key, val);
      }
    }

    if (url === config.gcpProxy?.url) mock.matchHeader("Authorization", /Bearer .*/);

    const statusCode = testData.statusCode ?? testData.status ?? 200;
    const responseBody = typeof testData.body === "object" ? JSON.stringify(testData.body) : testData.body;
    if (testData.stream && testData.compress) {
      mock.reply(statusCode, stream.Readable.from([ responseBody ]).pipe(zlib.createGzip()));
    } else if (testData.stream) {
      mock.reply(statusCode, stream.Readable.from([ responseBody ]), {
        "content-length": responseBody.length,
        ...testData.headers,
      });
    } else {
      mock.reply(statusCode, responseBody, testData.headers || undefined);
    }

    return {
      hasExpectedBody: (body) => {
        return actualBody.should.eql(body || request.body);
      },
      hasNotBeenCalled: () => {
        return should.not.exist(actualBody);
      },
      calledBody: () => {
        return actualBody;
      },
      postedBody: () => actualBody,
    };
  }

  function mountFolder(folderName) {
    const dirName = path.join(path.dirname(require.resolve("test-data")), folderName);
    return fs.readdirSync(dirName).map((fileName) => mount(path.join(folderName, fileName)));
  }

  function fakePrefixedResource(prefix, content, times = 1) {
    return fakeJsonResponse(`${prefix}/${content.type}/${content.id}`, content, times);
  }

  function fakeJsonResponse(apiPath, content, times = 1, status = 200) {
    return api.get(apiPath).times(times).reply(status, content);
  }

  function fakeNotExisting(apiPath, content, times = 1) {
    content = content || {};
    return api.get(apiPath).times(times).reply(404, content);
  }

  function fakeResource(content, times = 1) {
    return fakeJsonResponse(`/${content.type}/${content.id}`, content, times);
  }

  function fakeResources() {
    Array.prototype.forEach.call(arguments, fakeResource);
  }

  function mountExternal(external) {
    if (!external) {
      throw new Error("Could not mount, provided object is empty or missing external property");
    }

    const mounts = Object.values(external).map((value) => {
      return { mount: mount(value), external: value };
    });

    return mounts;
  }

  return {
    clone,
    disableNetConnect,
    fakeJsonResponse,
    fakeNotExisting,
    fakePrefixedResource,
    fakeResources,
    fakeResource,
    filteringPath: api.filteringPath.bind(api),
    get: url === config.gcpProxy?.url ? api.matchHeader("Authorization", /Bearer .*/).get.bind(api) : api.get.bind(api),
    post:
      url === config.gcpProxy?.url ? api.matchHeader("Authorization", /Bearer .*/).post.bind(api) : api.post.bind(api),
    put: url === config.gcpProxy?.url ? api.matchHeader("Authorization", /Bearer .*/).put.bind(api) : api.put.bind(api),
    delete:
      url === config.gcpProxy?.url
        ? api.matchHeader("Authorization", /Bearer .*/).delete.bind(api)
        : api.delete.bind(api),
    patch:
      url === config.gcpProxy?.url
        ? api.matchHeader("Authorization", /Bearer .*/).patch.bind(api)
        : api.patch.bind(api),
    mount,
    mountFolder,
    pendingMocks: api.pendingMocks.bind(api),
    matchHeader: api.matchHeader.bind(api),
    reset,
    mountExternal,
  };
}

export default init;
