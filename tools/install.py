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


# install devchat
#   devchat is a python package
# devchat should install in a virtual env
#    virtualenv is installed by: pip install virtualenv

def pip_install_devchat(pythoncmd):
    # run command: {pythoncmd} -m pip install devchat
    # check if devchat is installed
    # if not, install devchat

    # first step: check if devchat is installed
    try:
        # before command run, output runnning command
        print("run command: ", pythoncmd, "-m", "pip", "show", "devchat")
        subprocess.run([pythoncmd, "-m", "pip", "show", "devchat"], check=True, stdout=sys.stdout, stderr=sys.stderr, text=True)
        
        pipCommandEnv = pythoncmd.replace("/python", "/devchat")
        print("==> devchatCommandEnv: ", pipCommandEnv)
        
        return True
    except Exception as error:
        # devchat is not installed
        print('devchat is not installed')
        print(error)
        pass
    
    # second step: install devchat
    try:
        # before command run, output runnning command
        print("run command: ", pythoncmd, "-m", "pip", "install", "devchat")
        # redirect output to stdout
        subprocess.run([pythoncmd, "-m", "pip", "install", "devchat"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)

        pipCommandEnv = pythoncmd.replace("/python", "/devchat")
        print("==> devchatCommandEnv: ", pipCommandEnv)
        
        return True
    except Exception as error:
        print('devchat install failed')
        print(error)
        
    # reinstall 3 times
    for i in range(0,3):
        try:
            # before command run, output runnning command
            print("run command: ", pythoncmd, "-m", "pip", "install", "devchat", "-i", "https://pypi.tuna.tsinghua.edu.cn/simple")
            # redirect output to stdout
            subprocess.run([pythoncmd, "-m", "pip", "install", "devchat", "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)

            pipCommandEnv = pythoncmd.replace("/python", "/devchat")
            print("==> devchatCommandEnv: ", pipCommandEnv)
            
            return True
        except Exception as error:
            print('devchat install failed')
            print(error) 
            if i >= 2:
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
    try:
        # before command run, output runnning command
        print("run command: ", pythoncmd, "-m", "pip", "install", "--user", "virtualenv")
        # redirect output to stdout
        subprocess.run([pythoncmd, "-m", "pip", "install", "--user", "virtualenv"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
        return True
    except Exception as error:
        print('virtualenv install failed')
        print(error)
    
    
    # reinstall 3 times
    for i in range(0,3):
        try:
            # before command run, output runnning command
            print("run command: ", pythoncmd, "-m", "pip", "install", "--user", "virtualenv", "-i", "https://pypi.tuna.tsinghua.edu.cn/simple")
            # redirect output to stdout
            subprocess.run([pythoncmd, "-m", "pip", "install", "--user", "virtualenv", "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"], check=True,     stdout=sys.stdout, stderr=sys.stderr, text=True)
            return True
        except Exception as error:
            print('virtualenv install failed')
            print(error)
            if i >= 2:
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