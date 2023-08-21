import os
import re
import sys
import json
import tempfile
import uuid


from chat.ask_codebase.store.qdrant import QdrantWrapper as Q, get_client
from chat.ask_codebase.indexing.embedding import EmbeddingWrapper as E

from langchain.embeddings import HuggingFaceEmbeddings
from chat.ask_codebase.indexing.loader.file import (
    FileLoader,
    FileSource,
    gen_local_reference_maker,
)
from chat.util.misc import is_source_code
from chat.ask_codebase.chains.simple_qa import SimpleQA
from chat.ask_codebase.chains.stuff_dc_qa import StuffDocumentCodeQa

supportedFileTypes = []

STORAGE_FILE = os.path.join(tempfile.gettempdir(), "qdrant_storage2")
SOURCE_NAME = ""

# 为已经分析的文件记录最后修改时间
g_file_last_modified_saved = {}


def load_file_last_modified(filePath: str):
    # filePath表示存储了文件最后修改时间的文件名，内容实用JSON存储
    # 如果文件不存在，表示尚未进行分析，结束函数执行
    if not os.path.exists(filePath):
        return {}
    
    # 如果文件存在，读取文件内容，解析文件中记录的每一个文件的最后修改时间
    with open(filePath, 'r', encoding="utf-8") as f:
        fileLastModified = json.load(f)
        
    return fileLastModified


def save_file_last_modified(filePath: str, fileLastModified: dict):
    # filePath表示存储了文件最后修改时间的文件名，内容实用JSON存储
    with open(filePath, 'w+', encoding="utf-8") as f:
        json.dump(fileLastModified, f)
        
    return fileLastModified

def is_source_code_new(filePath: str):
    # 使用正则表达式来判断一个文件是否是源码文件
    for pattern in supportedFileTypes:
        if re.match(pattern.strip(), filePath):
            return True
    return False

def is_file_modified(filePath: str) -> bool:
    if not is_source_code_new(filePath):
        return False
    
    # 获取当前路径
    currentPath = os.getcwd()
    # 将filePath转换为相对路径
    relativePath = os.path.relpath(filePath, currentPath)
    
    # 检查文件路径中是否包含'.xxx'形式的目录
    for part in relativePath.split(os.sep):
        if part.startswith('.'):
            return False
    
    # 获取文件上次分析时记录的最后修改时间
    fileLastModified = g_file_last_modified_saved.get(relativePath, 0)
    # 获取文件当前的最后修改时间
    fileCurrentModified = os.path.getmtime(filePath)

    # 如果最后修改时间不同，那么更新记录的最后修改时间，并返回True
    if fileLastModified != fileCurrentModified:
        g_file_last_modified_saved[relativePath] = fileCurrentModified
        return True  
    return False      


def index(repo_path: str):
    try:
        client = get_client(STORAGE_FILE)
        source = FileSource(
            path=repo_path,
            rel_root=repo_path,
            ref_maker=gen_local_reference_maker(repo_path),
            file_filter=is_file_modified,
        )
        loader = FileLoader(sources=[source])
        documents = loader.load()

        e = E(embedding=HuggingFaceEmbeddings())
        data = e.embed(documents)
        q = Q.create(
            source_name=SOURCE_NAME,
            embedding_cls=HuggingFaceEmbeddings,
            client=client,
        )

        q.insert(data)
    except Exception as e:
        print(e)
        sys.exit(1)


import json

def query(question: str, doc_context: str):
    try:
        client = get_client(mode=STORAGE_FILE)
        q = Q.reuse(
            source_name=SOURCE_NAME,
            embedding_cls=HuggingFaceEmbeddings,
            client=client,
        )

        chain = StuffDocumentCodeQa(q)

        ans, docs = chain.run(question)

        print(f"\n# Question: \n{question}")
        print(f"\n# Answer: \n{ans}")
        print(f"\n# Relevant Documents: \n")
        doc_dict = {"path": "AskCode Context","content": json.dumps([{"filepath": d.metadata.get('filepath'), "content": d.page_content} for d in docs])}
        with open(doc_context, 'w') as f:
            json.dump(doc_dict, f)
        for d in docs:
            print(f"- filepath: {d.metadata.get('filepath')}")
            print(f"  location: {d.metadata.get('reference')}\n")

        print(f"Save doc context to {doc_context}")
    except Exception as e:
        print(e)
        sys.exit(1)


def main():
    try:
        global supportedFileTypes

        if len(sys.argv) < 2:
            print("Usage: python index_and_query.py [command] [args]")
            print("Available commands: index, query")
            sys.exit(1)
        
        command = sys.argv[1]
        
        if command == "index":
            if len(sys.argv) < 4:
                print("Usage: python index_and_query.py index [repo_path] [supportedFileTypes]")
                sys.exit(1)
            
            repo_path = sys.argv[2]
            # 获取supportedFileTypes的值
            supportedFileTypes = sys.argv[3].split(',')
            index(repo_path)
        
        elif command == "query":
            if len(sys.argv) < 4:
                print("Usage: python index_and_query.py query [question] [doc_context]")
                sys.exit(1)
            
            question = sys.argv[2]
            doc_context = sys.argv[3]
            query(question, doc_context)
        
        else:
            print("Invalid command. Available commands: index, query")
            sys.exit(1)
    except Exception as e:
        print(e)
        sys.exit(1)


if __name__ == "__main__":
    try:
        currentPath = os.getcwd()
        g_file_last_modified_saved = load_file_last_modified('./.chat/.index_modified.json')
        if os.path.exists(".chat/askcode.json"):
            with open(".chat/askcode.json", "r") as f:
                askcode_data = json.load(f)
                SOURCE_NAME = askcode_data.get("SOURCE_NAME", str(uuid.uuid4()))
        else:
            SOURCE_NAME = str(uuid.uuid4())
            currentPath = os.getcwd()
            with open(".chat/askcode.json", "w+") as f:
                json.dump({"SOURCE_NAME": SOURCE_NAME}, f)
        main()
        save_file_last_modified('./.chat/.index_modified.json', g_file_last_modified_saved)
        sys.exit(0)
    except Exception as e:
        print(e)
        sys.exit(1)