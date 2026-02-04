Optimize assets (fonts + images)
================================

Install dependencies (Python recommended):

```powershell
python -m pip install --upgrade pip
pip install fonttools brotli Pillow
```

Optional native tools (better results):
- `pngquant` (PNG quantization)
- `jpegoptim` or `mozjpeg` (JPEG optimization)

Run the optimizer:

```powershell
python scripts/optimize_assets.py
```

Notes:
- The script will attempt to create `.woff2` (preferred) or fall back to `.woff` for `.ttf` fonts using `pyftsubset`.
- PNG/JPEG files in `art/` will be recompressed in-place only when the compressed file is smaller.
- For best results install native compressors and run them manually on the `art/` folder.
