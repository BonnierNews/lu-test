"use strict";

const nock = require("nock");
const config = require("exp-config");
const stream = require("stream");
const zlib = require("zlib");

function init(url = config.proxyUrl) {
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
    let actualBody;
    const { request } = testData;
    if (request.baseUrl && request.baseUrl !== url) throw new Error(`Missmatching urls ${request.baseUrl} ${url}`);
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

    const statusCode = testData.statusCode ?? testData.status ?? 200;
    if (testData.stream && testData.compress) {
      mock.reply(statusCode, stream.Readable.from([ testData.body ]).pipe(zlib.createGzip()));
    } else if (testData.stream) {
      mock.reply(statusCode, stream.Readable.from([ testData.body ]), testData.headers);
    } else {
      mock.reply(statusCode, testData.body, testData.headers || undefined);
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

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
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
    get: api.get.bind(api),
    post: api.post.bind(api),
    put: api.put.bind(api),
    delete: api.delete.bind(api),
    patch: api.patch.bind(api),
    mount,
    pendingMocks: api.pendingMocks.bind(api),
    matchHeader: api.matchHeader.bind(api),
    reset,
    mountExternal,
  };
}

module.exports = init;
