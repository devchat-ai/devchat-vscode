export class FilePairManager {
  private static instance: FilePairManager;
  private filePairs: Map<string, [string, string]>;

  private constructor() {
    this.filePairs = new Map<string, [string, string]>();
  }

  static getInstance(): FilePairManager {
    if (!FilePairManager.instance) {
      FilePairManager.instance = new FilePairManager();
    }
    return FilePairManager.instance;
  }

  addFilePair(file1: string, file2: string): void {
    this.filePairs.set(file1, [file1, file2]);
    this.filePairs.set(file2, [file1, file2]);
  }

  findPair(file: string): [string, string] | undefined {
    return this.filePairs.get(file);
  }
}