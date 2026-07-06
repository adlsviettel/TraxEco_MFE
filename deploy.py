import os
import shutil

# Paths are relative to the workspace root where the script is executed
src_dist = os.path.join("apps", "host", "dist")
dest_path = r"\\192.168.14.10\c\Program Files\Ampps\www\trax-eco"

print(f"Starting safe deploy copy:")
print(f"Source: {src_dist}")
print(f"Destination: {dest_path}")

if not os.path.exists(src_dist):
    print("Error: Source dist directory does not exist! Please run 'npm run build' first.")
    exit(1)

if not os.path.exists(dest_path):
    print(f"Error: Destination path '{dest_path}' is not accessible! Check network connection.")
    exit(1)

# 1. Clean and copy assets folder
dest_assets = os.path.join(dest_path, "assets")
src_assets = os.path.join(src_dist, "assets")

if os.path.exists(dest_assets):
    print(f"Cleaning destination assets folder (ignoring errors on locked files): {dest_assets}")
    for root, dirs, files in os.walk(dest_assets, topdown=False):
        for file in files:
            file_path = os.path.join(root, file)
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Warning: Could not delete locked file {file}: {e}")
        for dir in dirs:
            dir_path = os.path.join(root, dir)
            try:
                os.rmdir(dir_path)
            except Exception as e:
                pass

print(f"Copying assets folder to destination...")
os.makedirs(dest_assets, exist_ok=True)
for file in os.listdir(src_assets):
    src_file = os.path.join(src_assets, file)
    dest_file = os.path.join(dest_assets, file)
    try:
        if os.path.isdir(src_file):
            shutil.copytree(src_file, dest_file, dirs_exist_ok=True)
        else:
            shutil.copy2(src_file, dest_file)
    except Exception as e:
        print(f"Warning: Could not copy file {file} (might be locked): {e}")

# 2. Copy other files and folders in dist
for item in os.listdir(src_dist):
    if item == "assets":
        continue
    
    src_item = os.path.join(src_dist, item)
    dest_item = os.path.join(dest_path, item)
    
    if os.path.isdir(src_item):
        print(f"Merging directory: {item}")
        os.makedirs(dest_item, exist_ok=True)
        for root, dirs, files in os.walk(src_item):
            rel_path = os.path.relpath(root, src_item)
            target_dir = dest_item if rel_path == "." else os.path.join(dest_item, rel_path)
            os.makedirs(target_dir, exist_ok=True)
            
            for file in files:
                s_file = os.path.join(root, file)
                d_file = os.path.join(target_dir, file)
                shutil.copy2(s_file, d_file)
    else:
        print(f"Copying file: {item}")
        shutil.copy2(src_item, dest_item)

print("Deploy completed successfully!")
