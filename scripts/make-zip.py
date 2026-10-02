import zipfile
import os
import sys

src_dir = os.path.abspath("public/desktop_package")
zip_out_public = os.path.abspath("public/PharmacyPOS_Windows_Desktop_EXE.zip")
zip_out_dist = os.path.abspath("dist/PharmacyPOS_Windows_Desktop_EXE.zip")
zip_out_single = os.path.abspath("dist_single/PharmacyPOS_Windows_Desktop_EXE.zip")

targets = [zip_out_public, zip_out_dist, zip_out_single]

for out_path in targets:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, src_dir)
                z.write(full_path, arcname=os.path.join("PharmacyPOS_MahmoudHamdy", rel_path))

print(f"✅ ZIP packages created successfully at {zip_out_public}")
