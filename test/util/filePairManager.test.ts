import { expect } from 'chai';
import { describe, it } from 'mocha';
import { FilePairManager } from '../../src/util/diffFilePairs';

describe('FilePairManager', () => {
  let filePairManager: FilePairManager;

  beforeEach(() => {
    filePairManager = FilePairManager.getInstance();
  });

  afterEach(() => {
    // Clear the filePairs map after each test
    (filePairManager as any).filePairs.clear();
  });

  it('add file pair', () => {
    const file1 = 'file1.txt';
    const file2 = 'file2.txt';
    filePairManager.addFilePair(file1, file2);
    expect(filePairManager.findPair(file1)).to.deep.equal([file1, file2]);
    expect(filePairManager.findPair(file2)).to.deep.equal([file1, file2]);
  });

  it('find pair', () => {
    const file1 = 'file1.txt';
    const file2 = 'file2.txt';
    const file3 = 'file3.txt';
    const file4 = 'file4.txt';
    filePairManager.addFilePair(file1, file2);
    filePairManager.addFilePair(file3, file4);
    expect(filePairManager.findPair(file1)).to.deep.equal([file1, file2]);
    expect(filePairManager.findPair(file2)).to.deep.equal([file1, file2]);
    expect(filePairManager.findPair(file3)).to.deep.equal([file3, file4]);
    expect(filePairManager.findPair(file4)).to.deep.equal([file3, file4]);
  });

  it('find non-existent pair', () => {
    const file1 = 'file1.txt';
    const file2 = 'file2.txt';
    const file3 = 'file3.txt';
    filePairManager.addFilePair(file1, file2);
    expect(filePairManager.findPair(file3)).to.be.undefined;
  });
});