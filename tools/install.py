import os
import subprocess
import sys

# replace python3 with sys.executable, we will do everything in the same envrionment
pythonCommand = sys.executable
print('Python command:', pythonCommand)

tools_dir = os.path.dirname(os.path.realpath(__file__))


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
        return False


def pip_cmd_run(pipcmd: list[str], with_user: bool, with_local_source: bool):
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
        
    file = open('test.txt', 'wb')
    try:
        # before command run, output runnning command
        print("run command: ", *pipcmd)
        subprocess.run(pipcmd, check=True,     stdout=sys.stdout, stderr=file, text=True)
        
        file.close()
        os.remove('test.txt')
        return True, ''
    except Exception as error:
        file.flush()
        file.close()
        file = open('test.txt', 'rb')
        error_out = file.read()
        file.close()
        os.remove('test.txt')
        
        print(error)
        return False, error_out


def pip_cmd_with_retries(pipcmd: list[str], retry_times: int, with_user: bool):
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
        pip_command_env = pythoncmd.replace("/python", "/devchat")
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
        subprocess.run([pythoncmd, "-m", "virtualenv", venvdir + "/" + envname], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
        return get_pythoncmd_in_env(venvdir, envname)
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
    venvdir = tools_dir
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