"use strict";

const SftpClient = require("ssh2-sftp-client");

async function list(ftpConfig, path, pattern, { logger }) {
  const { host, port, user, password, algorithms } = ftpConfig;
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host,
      port: (port || 22).toString(),
      username: user,
      password,
      algorithms,
    });

    const files = await sftp.list(path, pattern);
    logger.info(`Got files in path ${path} and pattern ${pattern}: ${JSON.stringify(files)}`);
    return files;
  } catch (error) {
    logger.error(`Error when listing on sftp ${error.message}`);
    throw error;
  } finally {
    await sftp.end();
  }
}

async function stream(ftpConfig, filePath, writeStream, { logger }) {
  const { host, port, user, password, algorithms } = ftpConfig;
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host,
      port: (port || 22).toString(),
      username: user,
      password,
      algorithms,
    });
    return await sftp.get(filePath, writeStream);
  } catch (error) {
    logger.error(`Error when streaming from sftp ${error.message}`);
    throw error;
  } finally {
    await sftp.end();
  }
}

async function copy(ftpConfig, sourcePath, targetPath, { logger }) {
  const { host, port, user, password, algorithms } = ftpConfig;
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host,
      port: (port || 22).toString(),
      username: user,
      password,
      algorithms,
    });
    const sourceBuf = await sftp.get(sourcePath);
    await sftp.put(sourceBuf, targetPath);
    logger.info(`copy done to ${targetPath}`);
  } catch (error) {
    logger.error(`Error when streaming from sftp ${error.message}`);
    throw error;
  } finally {
    await sftp.end();
  }
}

async function remove(ftpConfig, path, { logger, rejectUnless, rejectIf }) {
  const { host, port, user, password, algorithms } = ftpConfig;
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host,
      port: (port || 22).toString(),
      username: user,
      password,
      algorithms,
    });
    const existsOfType = await sftp.exists(path);
    if (!existsOfType) return;
    const fileType = "-";
    rejectUnless(
      existsOfType === fileType,
      `trying to remove an unsupported type, file "${path}" of type "${existsOfType}" ["l" symlink, "d" directory]`
    );
    await sftp.delete(path);
    logger.info(`deleted ${path} since it is (should been) processed`);
  } catch (e) {
    rejectIf(e.message.includes("sftp.delete: No such file"), `can't remove missing file, ${e.message}`);
    throw e;
  } finally {
    await sftp.end();
  }
}

async function put(ftpConfig, fileStream, path, { logger }) {
  const { host, port, user, password, algorithms, debugLogging } = ftpConfig;
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host,
      port: (port || 22).toString(),
      username: user,
      password,
      algorithms,
      debug: debugLogging ? logger.info.bind(logger) : undefined,
    });
    await sftp.put(fileStream, path);
  } catch (error) {
    logger.error(`Error when putting to sftp ${error.message}`);
    throw error;
  } finally {
    await sftp.end();
  }
}

async function exists(ftpConfig, path, { logger }) {
  const { host, port, user, password, algorithms } = ftpConfig;
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host,
      port: (port || 22).toString(),
      username: user,
      password,
      algorithms,
    });
    const existsOfType = await sftp.exists(path);
    return existsOfType ? true : false;
  } catch (error) {
    logger.error(`Error when checking exists on sftp ${error.message}`);
    throw error;
  } finally {
    await sftp.end();
  }
}

module.exports = {
  list,
  copy,
  stream,
  remove,
  put,
  exists,
};
