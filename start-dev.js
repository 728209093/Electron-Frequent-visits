#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// 启动 npm run dev，同时监听 Vite 输出来确定端口
const isWin = process.platform === 'win32';
const command = isWin ? 'npm.cmd' : 'npm';
const devProcess = spawn(command, ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: isWin,
});

let vitePort = 5173;
let electronStarted = false;

// 监听 Vite 的输出来确定端口
devProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);

  // 去除 ANSI 转义码后再匹配端口
  const clean = output.replace(/\x1b\[[0-9;]*m/g, '');
  const portMatch = clean.match(/Local:\s+http:\/\/localhost:(\d+)\//);
  if (portMatch && !electronStarted) {
    vitePort = parseInt(portMatch[1], 10);
    console.log(`\n✓ Vite running on port ${vitePort}`);

    // 延迟启动 Electron，等待 Vite 完全准备好
    setTimeout(() => {
      if (!electronStarted) {
        electronStarted = true;
        console.log(`\n✓ Starting Electron with Vite server at http://localhost:${vitePort}\n`);
        startElectron();
      }
    }, 2000);
  }
});

devProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

function startElectron() {
  const electronBin = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
  const electronProcess = spawn(electronBin, ['dist/main/main/index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: `http://localhost:${vitePort}`,
    },
  });

  electronProcess.on('exit', () => {
    devProcess.kill();
    process.exit(0);
  });
}

process.on('exit', () => {
  devProcess.kill();
});
