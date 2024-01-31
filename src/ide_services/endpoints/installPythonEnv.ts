import { logger } from "../../util/logger";

import {
    createEnvByConda,
    createEnvByMamba,
} from "../../util/python_installer/app_install";
import { installRequirements } from "../../util/python_installer/package_install";

export async function installPythonEnv(
    command_name: string,
    requirements_file: string
) {
    // 1. install python >= 3.11
    logger.channel()?.info(`create env for python ...`);
    logger.channel()?.info(`try to create env by mamba ...`);
    let pythonCommand = await createEnvByMamba(command_name, "", "3.11.4");

    if (!pythonCommand || pythonCommand === "") {
        logger
            .channel()
            ?.info(
                `create env by mamba failed, try to create env by conda ...`
            );
        pythonCommand = await createEnvByConda(command_name, "", "3.11.4");
    }

    if (!pythonCommand || pythonCommand === "") {
        logger
            .channel()
            ?.error(
                `create virtual python env failed, you need create it by yourself with command: "conda create -n devchat-commands python=3.11.4"`
            );
        logger.channel()?.show();

        return "";
    }

    // 3. install requirements.txt
    // run command: pip install -r {requirementsFile}
    let isInstalled = false;
    // try 3 times
    for (let i = 0; i < 4; i++) {
        let otherSource: string | undefined = undefined;
        if (i > 1) {
            otherSource = "https://pypi.tuna.tsinghua.edu.cn/simple/";
        }
        isInstalled = await installRequirements(
            pythonCommand,
            requirements_file,
            otherSource
        );
        if (isInstalled) {
            break;
        }
        logger.channel()?.info(`Install packages failed, try again: ${i + 1}`);
    }
    if (!isInstalled) {
        logger
            .channel()
            ?.error(
                `Install packages failed, you can install it with command: "${pythonCommand} -m pip install -r ${requirements_file}"`
            );
        logger.channel()?.show();
        return "";
    }

    return pythonCommand.trim();
}
