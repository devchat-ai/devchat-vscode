import { spawn, ChildProcess } from 'child_process';
import { findAvailablePort } from './findServicePort';
import * as http from 'http';
import { logger } from './logger';
import { DevChatConfig } from './config';

let serviceProcess: ChildProcess | null = null;

export async function startLocalService(extensionPath: string, workspacePath: string): Promise<number> {
  if (serviceProcess) {
    throw new Error('Local service is already running');
  }

  try {
    // 1. 获取可用端口号
    const port = await findAvailablePort();

    // 2. 设置环境变量 DC_SVC_PORT
    process.env.DC_SVC_PORT = port.toString();

    // 3. 设置 DC_SVC_WORKSPACE 环境变量
    process.env.DC_SVC_WORKSPACE = workspacePath;

    // 新增：设置 PYTHONPATH 环境变量
    process.env.PYTHONPATH = `${extensionPath}/tools/site-packages`;

    // 4. 启动进程 python main.py
    const mainPyPath = extensionPath + "/tools/site-packages/devchat/_service/main.py";
    const pythonApp =
                DevChatConfig.getInstance().get("python_for_chat") || "python3";
    serviceProcess = spawn(pythonApp, [mainPyPath], {
      env: { ...process.env },
      stdio: 'inherit',
      windowsHide: true, // hide the console window on Windows
    });

    serviceProcess.on('error', (err) => {
      logger.channel()?.error('Failed to start local service:', err);
      serviceProcess = null;
    });

    serviceProcess.on('exit', (code) => {
      logger.channel()?.info(`Local service exited with code ${code}`);
      serviceProcess = null;
    });

    // 5. 等待服务启动并验证
    await waitForServiceToStart(port);

    // 6. 服务启动成功后，记录启动的端口号到环境变量
    process.env.DC_LOCALSERVICE_PORT = port.toString();
    logger.channel()?.info(`Local service port recorded: ${port}`);

    return port;
  } catch (error) {
    logger.channel()?.error('Error starting local service:', error);
    throw error;
  }
}

async function waitForServiceToStart(port: number): Promise<void> {
  const maxRetries = 30;
  const retryInterval = 1000; // 1 second

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await new Promise<string>((resolve, reject) => {
        http.get(`http://localhost:${port}/ping`, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });

      if (response === '{"message":"pong"}') {
        logger.channel()?.info('Local service started successfully');
        return;
      }
    } catch (error) {
      // Ignore errors and continue retrying
    }

    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }

  throw new Error('Failed to start local service: timeout');
}

export async function stopLocalService(): Promise<void> {
  return new Promise((resolve) => {
    if (!serviceProcess) {
      logger.channel()?.warn('No local service is running');
      resolve();
      return;
    }

    serviceProcess.on('exit', () => {
      serviceProcess = null;
      logger.channel()?.info('Local service stopped');
      resolve();
    });

    serviceProcess.kill();
  });
}