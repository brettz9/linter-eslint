'use strict';

const ChildProcess = require('child_process')
const Path = require('path')
const FS = require('fs')

let prefixPath = null

function find(startDir, name) {
  let filePath
  const chunks = startDir.split(Path.sep)
  while (chunks.length) {
    filePath = Path.join(chunks.join(Path.sep), name)
    try {
      FS.accessSync(filePath, FS.R_OK)
      return filePath
    } catch (_) { }
    chunks.pop()
  }
  return null
}

function findEslintDir(params) {
  const eslintPathLocal = Path.join(FS.realpathSync(Path.join(__dirname, '..')), 'node_modules', 'eslint')
  const modulesPath = find(params.fileDir, 'node_modules')
  let eslintNewPath = null

  if (params.global) {
    if (params.nodePath === '' && prefixPath === null) {
      const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
      try {
        prefixPath = ChildProcess.spawnSync(npmCommand, ['get', 'prefix']).output[1].toString().trim()
      } catch (e) {
        throw new Error('Unable to execute `npm get prefix`. Please make sure Atom is getting $PATH correctly')
      }
    }
    if (process.platform === 'win32') {
      eslintNewPath = Path.join(params.nodePath || prefixPath, 'node_modules', 'eslint')
    } else {
      eslintNewPath = Path.join(params.nodePath || prefixPath, 'lib', 'node_modules', 'eslint')
    }
  } else {
    try {
      FS.accessSync(eslintNewPath = Path.join(modulesPath, 'eslint'), FS.R_OK)
    } catch (_) {
      eslintNewPath = eslintPathLocal
    }
  }

  return eslintNewPath
}

module.exports = {
  findEslintDir: findEslintDir,
  find: find
}
