"""Cuts the generated sheets into one square WebP per creature, tower or faction.

Three groups of sheets are cut: creature busts (assets-src/portraits -> public/assets/ui/portraits),
tower icons (assets-src/tower-icons -> public/assets/ui/tower-icons) and faction emblems
(assets-src/factions -> public/assets/ui/factions).

Busts and tower icons come from 4x4 grids of pictures drawn edge to edge, with no separators or
background between them. The grid is even, so every cell is cut at its exact fraction of the
sheet, trimmed by a small inset that drops the seam pixels the generator blends between
neighbours, and resized.

Faction emblems come from a 2x2 grid of emblems on a near-black background. Each cell's
background is keyed out into alpha, the emblem is trimmed to its content, padded to a square
with a small margin and resized; the WebP keeps the alpha channel. Re-running the cut gives
visually identical emblems; the files are not guaranteed to be byte-identical across Pillow
and libwebp versions.

Usage:
    python tools/slice-portraits.py
    python tools/slice-portraits.py --group tower-icons --size 256
    python tools/slice-portraits.py --group factions
"""
import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageFilter
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

# Race emblems, row-major on a 2x2 sheet: undead and orc on top, human and elf below.
FACTION_SHEETS: dict[str, list[str]] = {
    'sheet-factions.webp': ['undead', 'orc', 'human', 'elf'],
}

EMBLEM_GRID = 2
# Background keying on the brightest channel of each pixel: at or below the transparent
# level it is background, at or above the opaque level it is emblem, and alpha ramps
# linearly in between so glow and edges fade instead of cutting hard.
EMBLEM_TRANSPARENT_LEVEL = 22
EMBLEM_OPAQUE_LEVEL = 48
EMBLEM_ALPHA_BLUR_RADIUS = 0.8
# Alpha above this counts as emblem content when trimming the cell.
EMBLEM_CONTENT_ALPHA = 40
# Total empty margin around the trimmed emblem, as a fraction of its longer side
# (split evenly, so each side gets half).
EMBLEM_MARGIN = 0.06
EMBLEM_SIZE = 512
EMBLEM_WEBP_QUALITY = 90


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
    'factions': SheetGroup(
        Path('assets-src/factions'), Path('public/assets/ui/factions'), FACTION_SHEETS
    ),
}


def cell_box(
    sheet_size: tuple[int, int],
    column: int,
    row: int,
    grid: int = COLUMNS,
    inset: int = SEAM_INSET,
) -> tuple[int, int, int, int]:
    """Crop box of one cell of a square grid, inset on every side; edges round to whole pixels."""
    width, height = sheet_size
    left = round(column * width / grid) + inset
    top = round(row * height / grid) + inset
    right = round((column + 1) * width / grid) - inset
    bottom = round((row + 1) * height / grid) - inset
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


def background_level_to_alpha(level: int) -> int:
    if level <= EMBLEM_TRANSPARENT_LEVEL:
        return 0
    if level >= EMBLEM_OPAQUE_LEVEL:
        return 255
    span = EMBLEM_OPAQUE_LEVEL - EMBLEM_TRANSPARENT_LEVEL
    return round((level - EMBLEM_TRANSPARENT_LEVEL) * 255 / span)


def key_out_background(cell: Image.Image) -> Image.Image:
    """Turns the near-black background of an emblem cell into transparency."""
    red, green, blue = cell.split()
    brightest = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    alpha = brightest.point(background_level_to_alpha)
    alpha = alpha.filter(ImageFilter.GaussianBlur(EMBLEM_ALPHA_BLUR_RADIUS))
    keyed = cell.convert('RGBA')
    keyed.putalpha(alpha)
    return keyed


def pad_to_square(emblem: Image.Image) -> Image.Image:
    """Centres the trimmed emblem on a transparent square with an even margin."""
    longer_side = max(emblem.size)
    side = int(longer_side * (1 + EMBLEM_MARGIN))
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(emblem, ((side - emblem.width) // 2, (side - emblem.height) // 2))
    return square


def cut_emblem(cell: Image.Image) -> Image.Image:
    keyed = key_out_background(cell)
    content = keyed.getchannel('A').point(lambda alpha: 255 if alpha > EMBLEM_CONTENT_ALPHA else 0)
    bounds = content.getbbox()
    if bounds is None:
        sys.exit('emblem cell is empty after keying out the background')
    return pad_to_square(keyed.crop(bounds))


def slice_emblem_sheet(sheet_path: Path, race_ids: list[str], output: Path, size: int) -> None:
    sheet = Image.open(sheet_path).convert('RGB')
    if len(race_ids) != EMBLEM_GRID * EMBLEM_GRID:
        sys.exit(f'{sheet_path.name}: expected {EMBLEM_GRID * EMBLEM_GRID} ids, got {len(race_ids)}')
    for index, race_id in enumerate(race_ids):
        column, row = index % EMBLEM_GRID, index // EMBLEM_GRID
        cell = sheet.crop(cell_box(sheet.size, column, row, grid=EMBLEM_GRID, inset=0))
        emblem = cut_emblem(cell).resize((size, size), Image.Resampling.LANCZOS)
        emblem.save(
            output / f'{race_id}.webp', quality=EMBLEM_WEBP_QUALITY, method=6, exact=False
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--size', type=int, help=f'output side in px (default: 256, emblems {EMBLEM_SIZE})'
    )
    parser.add_argument(
        '--group', choices=sorted(SHEET_GROUPS), help='cut one group only (default: all)'
    )
    arguments = parser.parse_args()
    group_names = [arguments.group] if arguments.group else list(SHEET_GROUPS)
    for group_name in group_names:
        group = SHEET_GROUPS[group_name]
        group.output.mkdir(parents=True, exist_ok=True)
        is_emblem_group = group is SHEET_GROUPS['factions']
        size = arguments.size or (EMBLEM_SIZE if is_emblem_group else 256)
        slicer = slice_emblem_sheet if is_emblem_group else slice_sheet
        for sheet_name, ids in group.sheets.items():
            slicer(group.source / sheet_name, ids, group.output, size)
        count = sum(len(ids) for ids in group.sheets.values())
        print(f'{count} {group_name} written to {group.output}')


if __name__ == '__main__':
    main()
