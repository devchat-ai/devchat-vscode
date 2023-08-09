import os
import re
import pathlib
import subprocess
import sys
import tempfile


# replace python3 with sys.executable, we will do everything in the same envrionment
pythonCommand = sys.executable
print('Python command:', pythonCommand)

tools_dir = os.path.dirname(os.path.realpath(__file__))


def get_app_data_dir(app_name):
    home = os.path.expanduser("~")
    if os.name == "nt":  # For Windows
        appPath = os.path.join(home, "AppData", "Roaming", app_name)
    else:  # For Unix and Linux
        appPath = os.path.join(home, ".local", "share", app_name)
    
    if not os.path.exists(appPath):
        os.makedirs(appPath)
    return appPath


def get_pythoncmd_in_env(venvdir, envname):
    """
    return pythoncmd in virtual env
    """
    pythonCommandEnv = venvdir + "/" + envname + "/Scripts/python"
    try:
        subprocess.run([pythonCommandEnv, "-V"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
        return pythonCommandEnv
    except Exception:
        pass
    
    pythonCommandEnv = venvdir + "/" + envname + "/bin/python"
    try:
        subprocess.run([pythonCommandEnv, "-V"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
        return pythonCommandEnv
    except Exception:
        return ''


def pip_cmd_run(pipcmd, with_user: bool, with_local_source: bool):
    """
    run pip cmd
    with_user: --user
    with_local_source: -i https://pypi.tuna.tsinghua.edu.cn/simple
    """
    if with_user:
        pipcmd.append("--user")
    if with_local_source:
        pipcmd.append("-i")
        pipcmd.append("https://pypi.tuna.tsinghua.edu.cn/simple")
        
    with tempfile.NamedTemporaryFile(delete=True) as temp_file:
        try:
            # before command run, output runnning command
            print("run command: ", *pipcmd)
            subprocess.run(pipcmd, check=True, stdout=sys.stdout, stderr=temp_file, text=True)
            return True, ''
        except Exception as error:
            temp_file.flush()
            error_out = temp_file.read()
            print(error)
            return False, error_out


def pip_cmd_with_retries(pipcmd, retry_times: int, with_user: bool):
    """
    when pip cmd fails, then retry for retry_times
    with_user: --user   whether use --user, if pipcmd error output include --user, then remove --user while retry
    
    if pipcmd error output not include --user, then retry with with_local_source
    """
    with_local_source = False
    for i in range(0, retry_times):
        pipcmd_copy = pipcmd.copy()
        ret, error = pip_cmd_run(pipcmd_copy, with_user, with_local_source)
        if ret:
            return True
        
        if error.find(b"--user") > -1:
            with_user = False
        else:
            with_local_source = True
        
    return False


def pip_install_devchat(pythoncmd):
    # run command: {pythoncmd} -m pip install devchat
    # check if devchat is installed
    # if not, install devchat

    # first step: check if devchat is installed
    # try:
    #     # before command run, output runnning command
    #     print("run command: ", pythoncmd, "-m", "pip", "show", "devchat")
    #     subprocess.run([pythoncmd, "-m", "pip", "show", "devchat"], check=True, stdout=sys.stdout, stderr=sys.stderr, text=True)
        
    #     pipCommandEnv = pythoncmd.replace("/python", "/devchat")
    #     print("==> devchatCommandEnv: ", pipCommandEnv)
        
    #     return True
    # except Exception as error:
    #     # devchat is not installed
    #     print('devchat is not installed')
    #     print(error)
    #     pass
    
    # second step: install devchat
    if (pip_cmd_with_retries([pythoncmd, "-m", "pip", "install", "devchat", "--force"], 3, False)):
        # get parent path for pythoncmd
        pythoncmd_parent_path = pathlib.Path(pythoncmd).parent
        pip_command_env = os.path.join(pythoncmd_parent_path, "devchat")
        print("==> devchatCommandEnv: ", pip_command_env)
        return True
    else:
        print('devchat install failed')
        return False


def virtualenv_create_venv(pythoncmd, venvdir, envname):
    """
    virtualenvcmd is virtualenv with absolute path
    create virtual env by virtualenvcmd
    if env already exists, and pip has installed, then return pipcmd in virtual env
    else if env already exists, delete it.
    return pipcmd in virtual env
    """          
    def pipcmd_exists(pythoncmd, venvdir, envname):
        """
        check whether pip command installed
        """
        try:
            pythonCommandEnv = get_pythoncmd_in_env(venvdir, envname)
            if not pythonCommandEnv:
                return False
            
            # before command run, output runnning command
            print("run command: ", pythonCommandEnv, "-m", "pip", "--version")
            subprocess.run([pythonCommandEnv, "-m", "pip",  "--version"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
            return True
        except Exception:
            return False
    
    def extract_actual_location(text):
        match = re.search(r'Actual location:\s+"(.*?)"', text)
        if match:
            return match.group(1)
        else:
            return None

    # second step: check if env already exists
    if os.path.exists(venvdir + "/" + envname):
        # check if pip is installed
        # if pip is installed, return pipcmd in virtual env
        # else delete env
        # call pipcmd --version to check if pip is installed          
        if pipcmd_exists(pythoncmd, venvdir, envname):
            return get_pythoncmd_in_env(venvdir, envname)
        else:
            # delete env by virtualenvcmd
            print("delete env: ", venvdir + "/" + envname)
            try:
                # before command run, output runnning command
                print("run command: ", pythoncmd, "-m", "virtualenv", "--clear", venvdir + "/" + envname)
                subprocess.run([pythoncmd, "-m", "virtualenv", "--clear", venvdir + "/" + envname], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
            except Exception as error:
                print('delete env failed')
                print(error)
                return False
    
    # third step: create env by virtualenvcmd
    # handle error while creating env
    print("create env: ", venvdir + "/" + envname)
    try:
        # before command run, output runnning command
        print("run command: ", pythoncmd, "-m virtualenv", venvdir + "/" + envname)
        with tempfile.NamedTemporaryFile(delete=True) as temp_file:
            try:
                subprocess.run([pythoncmd, "-m", "virtualenv", venvdir + "/" + envname], check=True, stdout=temp_file, stderr=sys.stderr, text=True)
                pythonCmd = get_pythoncmd_in_env(venvdir, envname)
                if pythonCmd == '':
                    temp_file.flush()
                    outputText = temp_file.read()
                    pythonCmd = extract_actual_location(outputText)
                    if pythonCmd is None:
                        print('create env failed')
                        print(error)
                        return False
                return pythonCmd
            except Exception as error:
                print('create env failed')
                print(error)
                return False
    except Exception as error:
        print('create env failed')
        print(error)
        return False


def pip_install_virtualenv(pythoncmd):
    # run command: {pythoncmd} -m pip install virtualenv
    # check if virtualenv is installed
    # if not, install virtualenv

    # first step: check if virtualenv is installed
    try:
        # before command run, output runnning command
        print("run command: ", pythoncmd, "-m", "pip", "show", "virtualenv")
        subprocess.run([pythoncmd, "-m", "pip", "show", "virtualenv"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
        return True
    except Exception:
        # virtualenv is not installed
        print('virtualenv is not installed')
        pass
    
    # second step: install virtualenv
    if (pip_cmd_with_retries([pythoncmd, "-m", "pip", "install", "virtualenv"], 4, True)):
        return True
    else:
        print('virtualenv install failed')
        return False

        
def install_pip(pythoncmd):
    # run command: {pythoncmd} {tools_dir}/get-pip.py --force-reinstall
    # check if pip is installed
    # if not, install pip

    # first step: check if pip is installed
    try:
        # before command run, output runnning command
        print("run command: ", pythoncmd, "-m", "pip", "--version")
        subprocess.run([pythoncmd, "-m", "pip", "--version"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
        return True
    except Exception:
        # pip is not installed
        print('pip is not installed')
        pass
    
    # second step: install pip
    try:
        # before command run, output runnning command
        print("run command: ", pythoncmd, tools_dir + "/get-pip.py", "--force-reinstall")
        # redirect output to stdout
        subprocess.run([pythoncmd, tools_dir + "/get-pip.py", "--force-reinstall"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
        return True
    except Exception as error:
        print('pip install failed')
        print(error)
        return False
        

def main():
    """
    install pip
    install virtualenv
    create virtualenv
    install devchat 
    """
    pythoncommand = pythonCommand
    venvdir = get_app_data_dir('devchat')
    envname = "devchat"
    # install pip
    if not install_pip(pythoncommand):
        return False
    # install virtualenv
    if not pip_install_virtualenv(pythoncommand):
        return False
    # create virtualenv
    envPythonCmd = virtualenv_create_venv(pythoncommand, venvdir, envname)
    if not envPythonCmd:
        return False
    # install devchat
    if not pip_install_devchat(envPythonCmd):
        return False
    return True

if __name__ == "__main__":
    if not main():
        sys.exit(1)
    sys.exit(0)