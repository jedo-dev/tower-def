"""Cuts the generated creature portrait sheets into one square WebP per unit.

Each sheet (assets-src/portraits) is a 4x4 grid of bust portraits drawn edge to edge, with no
separators or background between them. The grid is even, so every cell is cut at its exact
fraction of the sheet, trimmed by a small inset that drops the seam pixels the generator
blends between neighbours, and resized.

Usage:
    python tools/slice-portraits.py
    python tools/slice-portraits.py --size 256 --out public/assets/ui/portraits
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - environment guard
    sys.exit('Pillow is required: pip install pillow')

SHEET_DIRECTORY = Path('assets-src/portraits')
COLUMNS, ROWS = 4, 4
# Pixels trimmed from every cell edge so a neighbour's seam never shows on the frame.
SEAM_INSET = 4
# 256px covers the largest bestiary portrait at 2x density; 32 files stay under 1 MB.
WEBP_QUALITY = 85

# Unit ids per sheet, row 1 left to right, then rows 2 to 4.
SHEETS: dict[str, list[str]] = {
    'sheet-undead-orc.webp': [
        'undead_skeleton', 'undead_ghoul', 'undead_crypt_fiend', 'undead_gargoyle',
        'undead_abomination', 'undead_necromancer', 'undead_banshee', 'undead_frost_wyrm',
        'orc_grunt', 'orc_peon', 'orc_wolf_rider', 'orc_troll',
        'orc_headhunter', 'orc_shaman', 'orc_wind_rider', 'orc_tauren',
    ],
    'sheet-human-elf.webp': [
        'human_militia', 'human_peasant', 'human_footman', 'human_rifleman',
        'human_siege_engine', 'human_knight', 'human_sorceress', 'human_gryphon_rider',
        'elf_archer', 'elf_wisp', 'elf_huntress', 'elf_dryad',
        'elf_chimera', 'elf_druid_of_the_claw', 'elf_hippogryph', 'elf_mountain_giant',
    ],
}


def cell_box(sheet_size: tuple[int, int], column: int, row: int) -> tuple[int, int, int, int]:
    """Crop box of one grid cell, inset on every side; cell edges round to whole pixels."""
    width, height = sheet_size
    left = round(column * width / COLUMNS) + SEAM_INSET
    top = round(row * height / ROWS) + SEAM_INSET
    right = round((column + 1) * width / COLUMNS) - SEAM_INSET
    bottom = round((row + 1) * height / ROWS) - SEAM_INSET
    return left, top, right, bottom


def slice_sheet(sheet_path: Path, unit_ids: list[str], output: Path, size: int) -> None:
    sheet = Image.open(sheet_path).convert('RGB')
    if len(unit_ids) != COLUMNS * ROWS:
        sys.exit(f'{sheet_path.name}: expected {COLUMNS * ROWS} unit ids, got {len(unit_ids)}')
    for index, unit_id in enumerate(unit_ids):
        column, row = index % COLUMNS, index // COLUMNS
        portrait = sheet.crop(cell_box(sheet.size, column, row))
        portrait = portrait.resize((size, size), Image.Resampling.LANCZOS)
        portrait.save(output / f'{unit_id}.webp', quality=WEBP_QUALITY, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--size', type=int, default=256)
    parser.add_argument('--out', type=Path, default=Path('public/assets/ui/portraits'))
    arguments = parser.parse_args()
    arguments.out.mkdir(parents=True, exist_ok=True)
    for sheet_name, unit_ids in SHEETS.items():
        slice_sheet(SHEET_DIRECTORY / sheet_name, unit_ids, arguments.out, arguments.size)
    print(f'{sum(len(ids) for ids in SHEETS.values())} portraits written to {arguments.out}')


if __name__ == '__main__':
    main()
