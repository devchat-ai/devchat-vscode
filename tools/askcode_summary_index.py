import os
import re
import json
import sys
from chat.ask_codebase.indexing.loader.file import FileMetadata, FileSource, simple_file_filter
from chat.ask_codebase.indexing.module_summary import SummaryWrapper

# 为已经分析的文件记录最后修改时间
g_file_last_modified_saved = {}

def load_file_last_modified(filePath: str):
    if not os.path.exists(filePath):
        return {}
    
    with open(filePath, 'r', encoding="utf-8") as f:
        fileLastModified = json.load(f)
        
    return fileLastModified

def save_file_last_modified(filePath: str, fileLastModified: dict):
    with open(filePath, 'w+', encoding="utf-8") as f:
        json.dump(fileLastModified, f)
        
    return fileLastModified

def is_source_code_new(filePath: str, supportedFileTypes):
    for pattern in supportedFileTypes:
        if re.match(pattern.strip(), filePath):
            return True
    return False

def is_file_modified(filePath: str, supportedFileTypes) -> bool:
    if not is_source_code_new(filePath, supportedFileTypes):
        return False
    
    relativePath = os.path.relpath(filePath, os.getcwd())
    
    for part in relativePath.split(os.sep):
        if part.startswith('.'):
            return False
    
    fileLastModified = g_file_last_modified_saved.get(relativePath, 0)
    fileCurrentModified = os.path.getmtime(filePath)

    if fileLastModified != fileCurrentModified:
        g_file_last_modified_saved[relativePath] = fileCurrentModified
        return True  
    return False

def custom_file_filter(file_path: str, supportedFileTypes) -> bool:
    needIndex = simple_file_filter(file_path)
    if not needIndex:
        print("==> ", file_path, needIndex)
        return needIndex
    
    if os.path.isdir(file_path):
        needIndex = True
    else:
        needIndex = is_file_modified(file_path, supportedFileTypes)
    print("==> ", file_path, needIndex)

    return needIndex

def index_directory(repo_dir: str, repo_cache_path: str, supportedFileTypes):
    """
    index files in repo_dir
    """
    global g_file_last_modified_saved
    g_file_last_modified_saved = load_file_last_modified('.chat/.index_modified.json')
    
    sw = SummaryWrapper(repo_cache_path, FileSource(
        path=repo_dir,
        rel_root=repo_dir,
        file_filter=lambda file_path: custom_file_filter(file_path, supportedFileTypes),
    ))
    
    for progress_info in sw.reindex(True, []):
        print(progress_info)
    
    save_file_last_modified('.chat/.index_modified.json', g_file_last_modified_saved)

def desc(repo_dir: str, repo_cache_path: str, target_path: str):
    """
    """
    target_path = target_path.replace(repo_dir, '') 
    sw = SummaryWrapper(repo_cache_path, FileSource(
        path=repo_dir,
        rel_root=repo_dir,
        file_filter=simple_file_filter,
    ))
    return sw.get_desc(target_path)
          
def context(repo_dir: str, repo_cache_path: str, target_path: str):
    """
    """
    target_path = os.path.relpath(target_path, repo_dir)
    sw = SummaryWrapper(repo_cache_path, FileSource(
        path=repo_dir,
        rel_root=repo_dir,
        file_filter=simple_file_filter,
    ))
    return sw.prepare_context_by_top_module(target_path)

def main():
    if len(sys.argv) < 2:
        print("Usage: python askcode_summary_index.py [command] [args]")
        print("Available commands: index, desc, context")
        sys.exit(1)
    
    command = sys.argv[1]
    
    # Set default values for repo_dir and repo_cache_path
    repo_dir = os.getcwd()
    repo_cache_path = os.path.join(repo_dir, '.chat', '.summary.json')
    
    if command == "index":
        if len(sys.argv) < 3:
            print("Usage: python askcode_summary_index.py index [supportedFileTypes]")
            sys.exit(1)
        
        supportedFileTypes = sys.argv[2].split(',')
        index_directory(repo_dir, repo_cache_path, supportedFileTypes)
    
    elif command == "desc":
        if len(sys.argv) < 3:
            print("Usage: python askcode_summary_index.py desc [target_path]")
            sys.exit(1)
        
        target_path = sys.argv[2]
        print(desc(repo_dir, repo_cache_path, target_path))
    
    elif command == "context":
        if len(sys.argv) < 3:
            print("Usage: python askcode_summary_index.py context [target_path]")
            sys.exit(1)
        
        target_path = sys.argv[2]
        print(context(repo_dir, repo_cache_path, target_path))
    
    else:
        print("Invalid command. Available commands: index, desc, context")
        sys.exit(1)

if __name__ == "__main__":
    main()