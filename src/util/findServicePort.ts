import net from 'net';

export async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer().listen();

    server.on('listening', () => {
      const address = server.address();
      if (typeof address !== 'object' || !address?.port) {
        server.close();
        reject(new Error('Failed to get port from server'));
        return;
      }
      server.close(() => resolve(address.port));
    });

    server.on('error', (err) => {
      const errWithCode = err as NodeJS.ErrnoException;
      if (errWithCode.code === 'EADDRINUSE') {
        reject(new Error('Port already in use'));
      } else {
        reject(err);
      }
    });
  });
}
