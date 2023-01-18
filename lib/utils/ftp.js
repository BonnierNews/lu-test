"use strict";

const ftp = require("basic-ftp");

async function list(ftpConfig, path, pattern, { logger }) {
  const { host, port, user, password, secure } = ftpConfig;
  const client = new ftp.Client();

  try {
    await client.access({
      host,
      port: (port || 21).toString(),
      user,
      password,
      secure,
    });

    const files = await client.list(path, pattern);
    logger.info(`Got files in path ${path} and pattern ${pattern}: ${JSON.stringify(files)}`);
    return files;
  } catch (error) {
    logger.error(`Error when listing on sftp ${error.message}`);
    throw error;
  } finally {
    client.close();
  }
}

async function put(ftpConfig, fileStream, path, { logger }) {
  const { host, port, user, password, secure } = ftpConfig;
  const client = new ftp.Client();
  try {
    await client.access({
      host,
      port: (port || 21).toString(),
      user,
      password,
      secure,
    });
    await client.uploadFrom(fileStream, path);
  } catch (error) {
    logger.error(`Error when putting to sftp ${error.message}`);
    throw error;
  } finally {
    client.close();
  }
}

module.exports = {
  list,
  put,
};
