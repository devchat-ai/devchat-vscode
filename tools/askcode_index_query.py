import os
import sys
from chat.ask_codebase.chains.smart_qa import SmartQA


def query(question, lsp_brige_port):
    root_path = os.getcwd()
    
    # Create an instance of SmartQA
    smart_qa = SmartQA(root_path)

    # Use SmartQA to get the answer
    answer = smart_qa.run(question=question, verbose=True, bridge_url=f'http://localhost:{lsp_brige_port}')

    # Print the answer
    print(answer[0])


def main():
    try:
        if len(sys.argv) < 4:
            print("Usage: python index_and_query.py query [question] [port]")
            sys.exit(1)
        
        question = sys.argv[2]
        port = sys.argv[3]
        query(question, port)
        sys.exit(0)
    except Exception as e:
        print(e)
        sys.exit(1)


if __name__ == "__main__":
    main()