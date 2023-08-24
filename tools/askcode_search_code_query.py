import os
import sys
from chat.ask_codebase.tools.search_code_pro import search_code_pro

print(sys.argv)
# the question to search for in the codebase, using https://github.com/helm/helm/issues/12176 as an example
question = sys.argv[1]
target_file = sys.argv[2]

# the root path of the codebase to search
root_path = os.getcwd()


if __name__ == "__main__":
    result = search_code_pro.run({"question": question, "root_path": root_path})
    with open(target_file, "w+") as f:
        f.write(result)
    print("search code result:", result)
