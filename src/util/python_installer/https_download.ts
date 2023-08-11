import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import { logger } from '../logger';

// download url to tmp directory
// return: local file path or empty string
export async function downloadFile(url: string): Promise<string> {
	const os = process.platform;
	const tempDir = os === 'win32' ? fs.realpathSync(process.env.USERPROFILE || '') : process.env.HOME;
    
  const fileName = path.basename(url); // 从 URL 中提取文件名称
  const destination = path.join(tempDir!, fileName); // 构建文件路径

  const file = fs.createWriteStream(destination);
  let downloadedBytes = 0;
  let totalBytes = 0;
  let lastProgress = 0;

  return new Promise<string>((resolve, reject) => {
    https.get(url, (response) => {
      totalBytes = parseInt(response.headers['content-length'] || '0', 10);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = (downloadedBytes / totalBytes) * 100;

        if (progress - lastProgress >= 3) {
          logger.channel()?.info(`Downloaded ${downloadedBytes} bytes (${progress.toFixed(2)}%)`);
          lastProgress = progress;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(destination); // 修改为传递下载的文件路径
      });
    }).on('error', (error) => {
      fs.unlink(destination, () => {
        resolve(''); // 下载失败时返回空字符串
      });
    });
  });
}