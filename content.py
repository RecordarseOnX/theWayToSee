import os

def list_dir(path=".", ignore_dirs=None, indent=0):
    """递归打印文件目录结构，忽略指定目录"""
    if ignore_dirs is None:
        ignore_dirs = {"node_modules", ".git", "__pycache__"}

    try:
        items = sorted(os.listdir(path))
    except PermissionError:
        return  # 无权限目录直接跳过

    for item in items:
        full_path = os.path.join(path, item)
        if os.path.isdir(full_path):
            if item in ignore_dirs:
                continue
            print("  " * indent + f"📁 {item}/")
            list_dir(full_path, ignore_dirs, indent + 1)
        else:
            print("  " * indent + f"📄 {item}")

if __name__ == "__main__":
    root_path = os.getcwd()  # 当前路径
    print(f"📂 项目目录: {root_path}\n")
    list_dir(root_path)
