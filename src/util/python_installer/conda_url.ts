/*
 Get conda download url
 */

 import os from 'os';
import { logger } from '../logger';
import { UiUtilVscode } from '../uiUtil_vscode';
import { UiUtilWrapper } from '../uiUtil';
import path from 'path';

 function getDownloadFileName(): string {
	const platform = os.platform();
	const arch = os.arch();
	logger.channel()?.info(`Platform: ${platform}, Arch: ${arch}`);

	if (platform === "win32") {
	  if (arch === "x64") {
		return "Miniconda3-latest-Windows-x86_64.exe";
	  } else if (arch === "ia32") {
		return "Miniconda3-latest-Windows-x86.exe";
	  } else {
		return "Miniconda3-latest-Windows-x86_64.exe";
	  }
	} else if (platform === "darwin") {
	  if (arch === "x64") {
		return "Miniconda3-latest-MacOSX-x86_64.sh";
	  } else if (arch === "arm64") {
		return "Miniconda3-latest-MacOSX-arm64.sh";
	  } else if (arch === "x86") {
		return "Miniconda3-latest-MacOSX-x86.sh";
	  } else {
		return "Miniconda3-latest-MacOSX-arm64.sh";
	  }
	} else if (platform === "linux") {
	  if (arch === "x64") {
		return "Miniconda3-latest-Linux-x86_64.sh";
	  } else if (arch === "s390x") {
		return "Miniconda3-latest-Linux-s390x.sh";
	  } else if (arch === "ppc64le") {
		return "Miniconda3-latest-Linux-ppc64le.sh";
	  } else if (arch === "aarch64") {
		return "Miniconda3-latest-Linux-aarch64.sh";
	  } else if (arch === "x86") {
		return "Miniconda3-latest-Linux-x86.sh";
	  } else if (arch === "armv7l") {
		return "Miniconda3-latest-Linux-armv7l.sh";
	  } else {
		return "Miniconda3-latest-Linux-x86_64.sh";
	  }
	}
  
	return "";
}

export function getMicromambaUrl(): string {
	const platform = os.platform();
	const arch = os.arch();
	logger.channel()?.info(`Platform: ${platform}, Arch: ${arch}`);

	let micromambaUrl = '';
	if (platform === "win32") {
		micromambaUrl = "micromamba-win-64";
	} else if (platform === "darwin") {
	  if (arch === "arm64") {
		micromambaUrl = "micromamba-osx-arm64";
	  } else if (arch === "x86" || arch === "x64") {
		micromambaUrl = "micromamba-osx-64";
	  } else {
		micromambaUrl = "micromamba-osx-64";
	  }
	} else if (platform === "linux") {
	  if (arch === "x64") {
		micromambaUrl = "micromamba-linux-64";
	  } else if (arch === "ppc64le") {
		micromambaUrl = "micromamba-linux-ppc64le";
	  } else if (arch === "aarch64") {
		micromambaUrl = "micromamba-linux-aarch64";
	  } else {
		micromambaUrl = "micromamba-linux-64";
	  }
	}

	const micromambaPath = path.join(UiUtilWrapper.extensionPath(), 'tools', micromambaUrl, "bin", "micromamba");
	return micromambaPath;
}

export function getCondaDownloadUrl(): string {
	return 'https://repo.anaconda.com/miniconda/' + getDownloadFileName();
}