"""Cuts the generated talent icon sheets into one square WebP per talent branch.

Each sheet (assets-src/talent-sheets, prompts in TALENT_ICON_PROMPTS.md) is a 4x2 grid of
framed icons on a flat dark background. The generator never lands the icons exactly on the
grid, so every cell is searched for its icon's bounding box, squared and resized.

Usage:
    python tools/slice-talent-icons.py
    python tools/slice-talent-icons.py --size 128 --out public/assets/ui/talents
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError:  # pragma: no cover - environment guard
    sys.exit('Pillow is required: pip install pillow')

SHEET_DIRECTORY = Path('assets-src/talent-sheets')
COLUMNS, ROWS = 4, 2
BACKGROUND_TOLERANCE = 28
# 128px WebP keeps 96 icons near 1 MB; the UI never draws them above ~64px.
WEBP_QUALITY = 86

# Branch ids per sheet, row 1 left to right then row 2; pairs are branch A then branch B.
SHEETS: dict[str, list[str]] = {
    'undead-A.png': [
        'undead_bone_archer_tower_volley', 'undead_bone_archer_tower_cursed',
        'undead_plague_tower_cloud', 'undead_plague_tower_corpse',
        'undead_frost_wyrm_nest_permafrost', 'undead_frost_wyrm_nest_breath',
        'undead_bone_obelisk_whisper', 'undead_bone_obelisk_harvest',
    ],
    'undead-B-1-3.png': [
        'undead_skeleton_bone_legion', 'undead_skeleton_reassembly',
        'undead_ghoul_frenzy', 'undead_ghoul_devourer',
        'undead_crypt_fiend_carapace', 'undead_crypt_fiend_web',
        'undead_gargoyle_stoneskin', 'undead_gargoyle_dive',
    ],
    'undead-C-4-6.png': [
        'undead_abomination_meat_mountain', 'undead_abomination_plague_sack',
        'undead_necromancer_raise_dead', 'undead_necromancer_soul_shield',
        'undead_banshee_wail', 'undead_banshee_incorporeal',
        'undead_frost_wyrm_frost_breath', 'undead_frost_wyrm_ancient_terror',
    ],
    'orc-A.png': [
        'orc_spear_watchtower_throwers', 'orc_spear_watchtower_heavy',
        'orc_burning_pit_napalm', 'orc_burning_pit_mortar',
        'orc_lightning_totem_storm', 'orc_lightning_totem_thunder',
        'orc_tar_pit_quagmire', 'orc_tar_pit_sticky',
    ],
    'orc-B-1-3.png': [
        'orc_grunt_rage', 'orc_grunt_shieldbearer',
        'orc_peon_workforce', 'orc_peon_sabotage',
        'orc_wolf_rider_pack_hunters', 'orc_wolf_rider_nets',
        'orc_troll_regeneration', 'orc_troll_berserker',
    ],
    'orc-C-4-6.png': [
        'orc_headhunter_tower_hunter', 'orc_headhunter_wind_walk',
        'orc_shaman_bloodlust', 'orc_shaman_earth_lightning',
        'orc_wind_rider_bomber', 'orc_wind_rider_tailwind',
        'orc_tauren_battering_ram', 'orc_tauren_warchief',
    ],
    'human-A.png': [
        'human_guard_archer_tower_company', 'human_guard_archer_tower_crossbow',
        'human_cannon_bastion_siege', 'human_cannon_bastion_grapeshot',
        'human_alchemist_tower_flasks', 'human_alchemist_tower_acid',
        'human_guard_post_headquarters', 'human_guard_post_treasury',
    ],
    'human-B-1-3.png': [
        'human_militia_levy', 'human_militia_torches',
        'human_peasant_tithe', 'human_peasant_repair',
        'human_footman_defensive_stance', 'human_footman_captains_shield',
        'human_rifleman_long_shot', 'human_rifleman_flak_vest',
    ],
    'human-C-4-6.png': [
        'human_siege_engine_armored_wagon', 'human_siege_engine_ram',
        'human_knight_paladin', 'human_knight_cavalry',
        'human_sorceress_invisibility', 'human_sorceress_polymorph',
        'human_gryphon_rider_sky_hammer', 'human_gryphon_rider_assault',
    ],
    'elf-A.png': [
        'elf_moon_archer_tower_moonfall', 'elf_moon_archer_tower_sniper',
        'elf_wisp_bloom_spores', 'elf_wisp_bloom_growth',
        'elf_moonwell_moonlight', 'elf_moonwell_living_water',
        'elf_thorn_spire_thorns', 'elf_thorn_spire_vine',
    ],
    'elf-B-1-3.png': [
        'elf_archer_evasion', 'elf_archer_forest_shadow',
        'elf_wisp_firefly', 'elf_wisp_detonation',
        'elf_huntress_moon_blade', 'elf_huntress_owl_scout',
        'elf_dryad_spell_immunity', 'elf_dryad_purify',
    ],
    'elf-C-4-6.png': [
        'elf_chimera_acid_breath', 'elf_chimera_two_headed',
        'elf_druid_of_the_claw_bear_form', 'elf_druid_of_the_claw_forest_whisper',
        'elf_hippogryph_whirlwind', 'elf_hippogryph_rider',
        'elf_mountain_giant_stone_flesh', 'elf_mountain_giant_uprooted_tree',
    ],
}


def find_icon_box(cell: Image.Image) -> tuple[int, int, int, int]:
    """Bounding box of everything that differs from the cell's corner colour."""
    background = Image.new('RGB', cell.size, cell.getpixel((2, 2)))
    difference = ImageChops.difference(cell, background).convert('L')
    mask = difference.point(lambda value: 255 if value > BACKGROUND_TOLERANCE else 0)
    box = mask.getbbox()
    if box is None:
        raise ValueError('empty cell')
    return box


def square_box(box: tuple[int, int, int, int], bounds: tuple[int, int]) -> tuple[int, int, int, int]:
    """Grows the shorter side so the crop is square, clamped to the cell."""
    left, top, right, bottom = box
    side = max(right - left, bottom - top)
    center_x, center_y = (left + right) // 2, (top + bottom) // 2
    left = min(max(center_x - side // 2, 0), bounds[0] - side)
    top = min(max(center_y - side // 2, 0), bounds[1] - side)
    return left, top, left + side, top + side


def slice_sheet(sheet_path: Path, branch_ids: list[str], output: Path, size: int) -> None:
    sheet = Image.open(sheet_path).convert('RGB')
    cell_width, cell_height = sheet.width // COLUMNS, sheet.height // ROWS
    for index, branch_id in enumerate(branch_ids):
        column, row = index % COLUMNS, index // COLUMNS
        cell = sheet.crop((column * cell_width, row * cell_height,
                           (column + 1) * cell_width, (row + 1) * cell_height))
        try:
            box = square_box(find_icon_box(cell), cell.size)
        except ValueError:
            sys.exit(f'{sheet_path.name}: no icon found for {branch_id} (cell {index + 1})')
        icon = cell.crop(box).resize((size, size), Image.Resampling.LANCZOS)
        icon.save(output / f'{branch_id}.webp', quality=WEBP_QUALITY, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--size', type=int, default=128)
    parser.add_argument('--out', type=Path, default=Path('public/assets/ui/talents'))
    arguments = parser.parse_args()
    arguments.out.mkdir(parents=True, exist_ok=True)
    for sheet_name, branch_ids in SHEETS.items():
        slice_sheet(SHEET_DIRECTORY / sheet_name, branch_ids, arguments.out, arguments.size)
    print(f'{sum(len(ids) for ids in SHEETS.values())} icons written to {arguments.out}')


if __name__ == '__main__':
    main()
