'use strict'
// Note: 'use babel' doesn't work in forked processes
process.title = 'linter-eslint helper'

const CP = require('childprocess-promise')
const Path = require('path')
const resolveEnv = require('resolve-env')
const Helpers = require('./es5-helpers')

const findEslintDir = Helpers.findEslintDir
const find = Helpers.find
const Communication = new CP()

// closed-over module-scope variables
let eslintPath = null
let eslint = null

Communication.on('JOB', function(job) {
  const params = job.Message
  const modulesPath = find(params.fileDir, 'node_modules')
  const eslintignoreDir = Path.dirname(find(params.fileDir, '.eslintignore'))
  let configFile = null
  global.__LINTER_RESPONSE = []

  // Check for project config file and determine
  // whether to bail out or use config specified in package options
  configFile = find(params.fileDir, '.eslintrc')
  if (params.canDisable && configFile === null) {
    job.Response = []
    return
  } else if (params.configFile) {
    configFile = params.configFile
  }

  if (modulesPath) {
    process.env.NODE_PATH = modulesPath
  } else process.env.NODE_PATH = ''
  require('module').Module._initPaths()
  process.chdir(params.fileDir)

  // Determine which eslint instance to use
  const eslintNewPath = findEslintDir(params)
  if (eslintNewPath !== eslintPath) {
    try {
      eslint = require(Path.join(eslintNewPath, 'lib', 'cli.js'))
      eslintPath = eslintNewPath
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        throw new Error('ESLint not found, Please install or make sure Atom is getting $PATH correctly')
      } else throw e
    }
  }

  job.Response = new Promise(function(resolve) {
    // Use a relative path for .eslintignore support
    const filePath = (eslintignoreDir) ? Path.relative(eslintignoreDir, params.filePath) : params.filePath
    const argv = [
      process.execPath,
      eslintPath,
      '--stdin',
      '--format',
      Path.join(__dirname, 'reporter.js')
    ]
    if (params.rulesDir) {
      let rulesDir = resolveEnv(params.rulesDir)
      if (!Path.isAbsolute(rulesDir)) {
        rulesDir = find(params.fileDir, rulesDir)
      }
      argv.push('--rulesdir', rulesDir)
    }
    if (configFile !== null) {
      argv.push('--config', configFile)
    }
    argv.push('--stdin-filename', filePath)
    process.argv = argv
    eslint.execute(process.argv, params.contents)
    resolve(global.__LINTER_RESPONSE)
  })
})

process.exit = function() { /* Stop eslint from closing the daemon */ }
