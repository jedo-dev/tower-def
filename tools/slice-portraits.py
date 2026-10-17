"""Cuts the generated portrait sheets into one square WebP per creature or tower.

Two groups of sheets are cut: creature busts (assets-src/portraits -> public/assets/ui/portraits)
and tower icons (assets-src/tower-icons -> public/assets/ui/tower-icons). Each sheet is a 4x4 grid
of pictures drawn edge to edge, with no separators or background between them. The grid is even, so every cell is cut at its exact
fraction of the sheet, trimmed by a small inset that drops the seam pixels the generator
blends between neighbours, and resized.

Usage:
    python tools/slice-portraits.py
    python tools/slice-portraits.py --group tower-icons --size 256
"""
import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - environment guard
    sys.exit('Pillow is required: pip install pillow')

COLUMNS, ROWS = 4, 4
# Pixels trimmed from every cell edge so a neighbour's seam never shows on the frame.
SEAM_INSET = 4
# 256px covers the largest bestiary portrait at 2x density; 32 files stay under 1 MB.
WEBP_QUALITY = 85

# Unit ids per sheet, row 1 left to right, then rows 2 to 4.
PORTRAIT_SHEETS: dict[str, list[str]] = {
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

# Race tower ids per sheet, same row-major order.
TOWER_ICON_SHEETS: dict[str, list[str]] = {
    'sheet-towers.webp': [
        'undead_bone_archer_tower', 'undead_plague_tower', 'undead_frost_wyrm_nest',
        'undead_bone_obelisk',
        'orc_spear_watchtower', 'orc_burning_pit', 'orc_lightning_totem', 'orc_tar_pit',
        'human_guard_archer_tower', 'human_cannon_bastion', 'human_alchemist_tower',
        'human_guard_post',
        'elf_moon_archer_tower', 'elf_wisp_bloom', 'elf_moonwell', 'elf_thorn_spire',
    ],
}


@dataclass(frozen=True)
class SheetGroup:
    source: Path
    output: Path
    sheets: dict[str, list[str]]


SHEET_GROUPS: dict[str, SheetGroup] = {
    'portraits': SheetGroup(
        Path('assets-src/portraits'), Path('public/assets/ui/portraits'), PORTRAIT_SHEETS
    ),
    'tower-icons': SheetGroup(
        Path('assets-src/tower-icons'), Path('public/assets/ui/tower-icons'), TOWER_ICON_SHEETS
    ),
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
        sys.exit(f'{sheet_path.name}: expected {COLUMNS * ROWS} ids, got {len(unit_ids)}')
    for index, unit_id in enumerate(unit_ids):
        column, row = index % COLUMNS, index // COLUMNS
        portrait = sheet.crop(cell_box(sheet.size, column, row))
        portrait = portrait.resize((size, size), Image.Resampling.LANCZOS)
        portrait.save(output / f'{unit_id}.webp', quality=WEBP_QUALITY, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--size', type=int, default=256)
    parser.add_argument(
        '--group', choices=sorted(SHEET_GROUPS), help='cut one group only (default: all)'
    )
    arguments = parser.parse_args()
    group_names = [arguments.group] if arguments.group else list(SHEET_GROUPS)
    for group_name in group_names:
        group = SHEET_GROUPS[group_name]
        group.output.mkdir(parents=True, exist_ok=True)
        for sheet_name, ids in group.sheets.items():
            slice_sheet(group.source / sheet_name, ids, group.output, arguments.size)
        count = sum(len(ids) for ids in group.sheets.values())
        print(f'{count} {group_name} written to {group.output}')


if __name__ == '__main__':
    main()
