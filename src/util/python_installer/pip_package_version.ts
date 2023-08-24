import { execSync } from 'child_process';

export function getPackageVersion(pythonPath: string, packageName: string): string | undefined {
    try {
        const stdout = execSync(`${pythonPath} -m pip show ${packageName}`).toString();
        const versionLine = stdout.split('\n').find(line => line.startsWith('Version'));
        return versionLine ? versionLine.split(': ')[1] : undefined;
    } catch (error) {
        console.error(`exec error: ${error}`);
        return undefined;
    }
}
