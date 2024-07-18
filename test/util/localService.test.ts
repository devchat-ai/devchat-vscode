// test/util/localService.test.ts

import { expect } from 'chai';
import { startLocalService, stopLocalService } from '../../src/util/localService';
import * as http from 'http';

describe('localService', () => {
  let port: number;

  describe('startLocalService', () => {
    it('should start the local service successfully', async () => {
      const extensionPath = '.';
      const workspacePath = '.';

      port = await startLocalService(extensionPath, workspacePath);

      expect(port).to.be.a('number');
      expect(process.env.DC_SVC_PORT).to.equal(port.toString());
      expect(process.env.DC_SVC_WORKSPACE).to.equal(workspacePath);
      expect(process.env.DC_LOCALSERVICE_PORT).to.equal(port.toString());

      // Verify that the service is running by sending a ping request
      const response = await sendPingRequest(port);
      expect(response).to.equal('{"message":"pong"}');
    });
  });

  describe('stopLocalService', () => {
  it('should stop the local service', async () => {
    await stopLocalService();

    // Wait a bit to ensure the service has fully stopped
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify that the service is no longer running
    try {
      await sendPingRequest(port);
      throw new Error('Service is still running');
    } catch (error) {
      console.log('Error type:', typeof error);
      console.log('Error:', error);

      if (error instanceof Error) {
        expect(error.message).to.include('connect ECONNREFUSED');
      } else if (typeof error === 'object' && error !== null) {
        // Check if the error object has a 'code' property
        if ('code' in error) {
          expect(error.code).to.equal('ECONNREFUSED');
        } else if ('errors' in error && Array.isArray(error.errors)) {
          // Check if it's an AggregateError-like object
          const hasConnectionRefused = error.errors.some((e: any) => e.code === 'ECONNREFUSED');
          expect(hasConnectionRefused).to.be.true;
        } else {
          throw new Error(`Unexpected error structure: ${JSON.stringify(error)}`);
        }
      } else {
        throw new Error(`Unexpected error type: ${typeof error}`);
      }
    }
  });
});
});

function sendPingRequest(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/ping`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}