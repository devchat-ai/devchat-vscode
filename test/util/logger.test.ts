// test/util/logger.test.ts

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { logger, LogChannel } from '../../src/util/logger';

class MockLogChannel implements LogChannel {
  logs: string[] = [];

  info(message: string, ...args: any[]): void {
    this.logs.push(`[INFO] ${message} ${args.join(' ')}`);
  }

  warn(message: string, ...args: any[]): void {
    this.logs.push(`[WARN] ${message} ${args.join(' ')}`);
  }

  error(message: string | Error, ...args: any[]): void {
    this.logs.push(`[ERROR] ${message} ${args.join(' ')}`);
  }

  debug(message: string, ...args: any[]): void {
    this.logs.push(`[DEBUG] ${message} ${args.join(' ')}`);
  }

  show(): void {
    // Do nothing
  }
}

describe('logger', () => {
  it('should initialize the logger and create a channel', () => {
    // Arrange
    const mockChannel = new MockLogChannel();

    // Act
    logger.init(mockChannel);

    // Assert
    const channel = logger.channel();
    expect(channel).to.not.be.undefined;
    expect(channel).to.equal(mockChannel);
  });

  it('should log messages using the initialized channel', () => {
    // Arrange
    const mockChannel = new MockLogChannel();
    logger.init(mockChannel);

    // Act
    logger.channel()?.info('Test info message');
    logger.channel()?.warn('Test warn message');
    logger.channel()?.error('Test error message');
    logger.channel()?.debug('Test debug message');

    // Assert
    expect(mockChannel.logs).to.deep.equal([
      '[INFO] Test info message ',
      '[WARN] Test warn message ',
      '[ERROR] Test error message ',
      '[DEBUG] Test debug message ',
    ]);
  });
});