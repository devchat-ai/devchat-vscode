// test/util/findServicePort.test.ts

import { expect } from 'chai';
import net from 'net';
import { findAvailablePort } from '../../src/util/findServicePort';

describe('findAvailablePort', () => {
  it('should return an available port when successful', async () => {
    // Arrange
    const expectedPort = await findAvailablePort();

    // Act
    const server = net.createServer();
    const isAvailable = await new Promise<boolean>((resolve) => {
      server.listen(expectedPort, () => {
        server.close();
        resolve(true);
      });
      server.on('error', () => {
        resolve(false);
      });
    });

    // Assert
    expect(isAvailable).to.be.true;
    expect(expectedPort).to.be.a('number');
    expect(expectedPort).to.be.greaterThan(0);
  });
});