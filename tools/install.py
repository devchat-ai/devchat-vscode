import os
import subprocess
import sys

def check_pipx_installed():
    try:
        subprocess.run(["pipx", "--version"], check=True)
        return True
    except Exception as e:
        return False

def install_pipx():
    print("Installing pipx...")
    try:
        subprocess.run(["python3", "-m", "pip", "install", "pipx", "--force"], check=True)
        print("pipx installed successfully.")
    except subprocess.CalledProcessError as e:
        print("Error installing pipx:", e, file=sys.stderr)
        sys.exit(1)

def add_pipx_to_path():
    print("Adding pipx to PATH...")
    subprocess.run(["python3", "-m", "pipx", "ensurepath"], check=True)
    result = subprocess.run(["python3", "-m", "pipx", "environment"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    pipx_path_line = [line for line in result.stdout.splitlines() if "PIPX_BIN_DIR" in line]
    if pipx_path_line:
        pipx_path = pipx_path_line[0].split('=')[-1].strip()
        os.environ["PATH"] += os.pathsep + pipx_path
        print("pipx path added to environment variables.")
    else:
        print("Error: Could not find pipx path in environment output.", file=sys.stderr)
        sys.exit(1)

def install_devchat():
    print("Installing devchat...")
    try:
        subprocess.run(["pipx", "install", "devchat"], check=True)
        print("devchat installed successfully.")
    except subprocess.CalledProcessError as e:
        print("Error installing devchat:", e, file=sys.stderr)
        sys.exit(1)

def upgrade_devchat():
    print("Upgrading devchat...")
    try:
        subprocess.run(["pipx", "upgrade", "devchat"], check=True)
        print("devchat upgraded successfully.")
    except subprocess.CalledProcessError as e:
        print("Error upgrading devchat:", e, file=sys.stderr)
        sys.exit(1)

def main():
    if not check_pipx_installed():
        install_pipx()
        add_pipx_to_path()
    install_devchat()
    upgrade_devchat()

if __name__ == "__main__":
    main()