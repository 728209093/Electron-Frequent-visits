#!/usr/bin/env node
const { spawn } = require('child_process')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const isWin = process.platform === 'win32'
const vitePkgPath = require.resolve('vite/package.json')
const viteBin = require('path').join(require('path').dirname(vitePkgPath), 'bin', 'vite.js')
const command = isWin ? process.execPath : process.execPath

const child = spawn(command, [viteBin], {
  cwd: __dirname,
  stdio: 'inherit',
  env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
