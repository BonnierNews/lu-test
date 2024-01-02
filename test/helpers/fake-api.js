import nock from "nock";
import config from "exp-config";
import stream from "stream";
import zlib from "zlib";
import testData from "test-data";

import clone from "./clone.js";

const proxyUrl = config.gcpProxy.url;

function init(url = proxyUrl) {
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

  async function mountFile(filename, times) {
    const { default: testRequest } = await testData(filename);
    return mount(testRequest, times);
  }

  function mount(testRequest, times) {
    if (Array.isArray(testRequest)) {
      return testRequest.map(mount);
    }
    let actualBody;
    const { request } = testRequest;
    if (request.baseUrl && request.baseUrl !== url) throw new Error(`Mismatching urls ${request.baseUrl} ${url}`);
    const mock = api[request.method.toLowerCase()](request.path, (body) => {
      actualBody = body;
      return true;
    });

    if (times || testRequest.times) mock.times(times || testRequest.times);

    if (request.query) {
      mock.query(request.query);
    }

    let hasContentType = false;
    if (request.headers) {
      for (const [ key, val ] of Object.entries(request.headers)) {
        if (key.toLowerCase() === "content-type") hasContentType = true;
        mock.matchHeader(key, val);
      }
    }

    const headers = testRequest.headers || {};
    if (!hasContentType) headers["Content-Type"] = "application/json";

    if (url === proxyUrl) mock.matchHeader("Authorization", /Bearer .*/);

    const statusCode = testRequest.statusCode ?? testRequest.status ?? 200;
    const responseBody =
      typeof testRequest.body === "object" && !Buffer.isBuffer(testRequest.body)
        ? JSON.stringify(testRequest.body)
        : testRequest.body;
    if (testRequest.stream && testRequest.compress) {
      mock.reply(statusCode, stream.Readable.from([ responseBody ]).pipe(zlib.createGzip()), headers);
    } else if (testRequest.stream) {
      mock.reply(statusCode, stream.Readable.from([ responseBody ]), {
        "content-length": responseBody.length,
        ...headers,
      });
    } else {
      mock.reply(statusCode, responseBody, headers);
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
    get: url === proxyUrl ? api.matchHeader("Authorization", /Bearer .*/).get.bind(api) : api.get.bind(api),
    post: url === proxyUrl ? api.matchHeader("Authorization", /Bearer .*/).post.bind(api) : api.post.bind(api),
    put: url === proxyUrl ? api.matchHeader("Authorization", /Bearer .*/).put.bind(api) : api.put.bind(api),
    delete: url === proxyUrl ? api.matchHeader("Authorization", /Bearer .*/).delete.bind(api) : api.delete.bind(api),
    patch: url === proxyUrl ? api.matchHeader("Authorization", /Bearer .*/).patch.bind(api) : api.patch.bind(api),
    mount,
    mountFile,
    pendingMocks: api.pendingMocks.bind(api),
    matchHeader: api.matchHeader.bind(api),
    reset,
    mountExternal,
  };
}

export default init;
