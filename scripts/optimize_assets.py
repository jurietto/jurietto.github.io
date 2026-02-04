#!/usr/bin/env python3
"""Optimize fonts and images for the site.

Fonts:
- Uses `pyftsubset` (fonttools) to produce `woff2` (preferred) or `woff` output.

Images:
- Uses Pillow to recompress JPEG/PNG files in-place when resulting file is smaller.

Usage:
  python scripts/optimize_assets.py

Dependencies:
  pip install fonttools brotli Pillow
  (optional) pngquant / jpegoptim for better results
"""
import shutil
import subprocess
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "font"
ART_DIR = ROOT / "art"


def has_cmd(name):
    return shutil.which(name) is not None


def optimize_fonts():
    ttf_files = list(FONT_DIR.glob("*.ttf"))
    if not ttf_files:
        print("No .ttf fonts found in", FONT_DIR)
        return
    # Prefer calling the pyftsubset CLI; if not on PATH, call via python -m fontTools.subset
    use_module = False
    if not has_cmd("pyftsubset"):
        # try module fallback
        use_module = True

    for t in ttf_files:
        out_w2 = t.with_suffix(".woff2")
        out_w = t.with_suffix(".woff")
        args_base_w2 = [str(t), "--flavor=woff2", "--output-file=" + str(out_w2)]
        args_base_w = [str(t), "--flavor=woff", "--output-file=" + str(out_w)]

        def run_subset(args):
            if not use_module:
                cmd = ["pyftsubset"] + args
            else:
                cmd = [sys.executable, "-m", "fontTools.subset"] + args
            return subprocess.run(cmd, check=True)

        try:
            print(f"Generating {out_w2.name} from {t.name}...")
            run_subset(args_base_w2)
            print("Created", out_w2)
        except subprocess.CalledProcessError:
            try:
                print("woff2 failed — falling back to woff")
                run_subset(args_base_w)
                print("Created", out_w)
            except subprocess.CalledProcessError as e:
                print("Failed to convert", t, " — ", e)


def compress_images():
    try:
        from PIL import Image
    except Exception:
        print("Pillow not installed. Run: pip install Pillow")
        return

    img_exts = ("*.png", "*.jpg", "*.jpeg")
    files = []
    for ext in img_exts:
        files.extend(ART_DIR.rglob(ext))

    if not files:
        print("No images found in", ART_DIR)
        return

    for p in files:
        try:
            img = Image.open(p)
            orig_size = p.stat().st_size
            tmp = p.with_suffix('.tmp' + p.suffix)
            fmt = img.format or ("PNG" if p.suffix.lower() == ".png" else "JPEG")
            if fmt.upper() == 'PNG':
                img.save(tmp, format='PNG', optimize=True)
            else:
                img = img.convert('RGB')
                img.save(tmp, format='JPEG', quality=82, optimize=True)

            new_size = tmp.stat().st_size
            if new_size < orig_size:
                tmp.replace(p)
                print(f"Compressed {p.name}: {orig_size} -> {new_size} bytes")
            else:
                tmp.unlink()
                print(f"Skipping {p.name}: compression not smaller")
        except Exception as e:
            print("Failed to process", p, "->", e)


def main():
    print("Root:", ROOT)
    if not FONT_DIR.exists():
        print("Font dir not found, skipping fonts:", FONT_DIR)
    else:
        optimize_fonts()

    if not ART_DIR.exists():
        print("Art dir not found, skipping images:", ART_DIR)
    else:
        compress_images()


if __name__ == '__main__':
    main()
