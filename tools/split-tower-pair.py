"""Splits a two-tower generation into two game tower sheets.

TOWER_SPRITE_PROMPTS.md asks for two towers on one magenta image, a 5x6 grid: rows 1-3 are
tower A, rows 4-6 tower B. The model keeps the five columns but not the row heights, and shots
in the attack frames fly across the column line, so a plain even grid cuts frames in half.
This script finds the six rows by the magenta gaps between them, gives every connected blob to
the column its centre falls in, re-lays each tower on an even 5x3 grid and hands that to
build-sprite-sheet.py, which keys, scales and baselines the frames as for any tower sheet.

Usage:
    python tools/split-tower-pair.py raw.png undead_plague undead_frost_wyrm_nest --fill-b 0.68
    python tools/split-tower-pair.py raw.png orc_tar_pit orc_spear_watchtower --fill-a 0.7
"""
import argparse
import subprocess
import sys
from collections import deque
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - environment guard
    sys.exit('Pillow is required: pip install pillow')

COLUMNS = 5
ROWS_PER_TOWER = 3
KEY = (255, 0, 255)
KEY_TOLERANCE = 60
# A scan line with this few subject pixels still counts as a gap between rows.
GAP_NOISE_PIXELS = 3
CELL_PADDING = 8
# A blob this share of the row's biggest one is a building (or a whole effect frame), not a shot.
ANCHOR_SHARE = 0.15
# Row of a tower block with ATTACK 1-3, the only frames that shoot (TOWER_SHEET_CONTRACT_FRAMES).
ATTACK_ROW = 1
TOOLS_DIRECTORY = Path(__file__).resolve().parent
TOWER_DIRECTORY = Path('public/assets/towers')
WORK_DIRECTORY = Path('output/tower-pairs')


def subject_mask(image: Image.Image) -> list[list[bool]]:
    pixels = image.load()
    return [
        [
            not all(abs(channel - key) <= KEY_TOLERANCE for channel, key in zip(pixels[x, y][:3], KEY))
            for x in range(image.width)
        ]
        for y in range(image.height)
    ]


def find_row_bands(mask: list[list[bool]]) -> list[tuple[int, int]]:
    """Vertical spans of content separated by magenta gaps, top to bottom."""
    bands: list[tuple[int, int]] = []
    start = None
    for y, line in enumerate(mask):
        has_content = sum(line) > GAP_NOISE_PIXELS
        if has_content and start is None:
            start = y
        elif not has_content and start is not None:
            bands.append((start, y))
            start = None
    if start is not None:
        bands.append((start, len(mask)))
    return bands


def merge_to_count(bands: list[tuple[int, int]], count: int) -> list[tuple[int, int]]:
    """Folds the thinnest band into its nearer neighbour until `count` remain.

    Extra bands are specks (a stray spark above a row, a drip below it), never real rows, so the
    thinnest one goes first.
    """
    bands = list(bands)
    while len(bands) > count:
        index = min(range(len(bands)), key=lambda candidate: bands[candidate][1] - bands[candidate][0])
        gap_above = bands[index][0] - bands[index - 1][1] if index > 0 else None
        gap_below = bands[index + 1][0] - bands[index][1] if index < len(bands) - 1 else None
        if gap_below is None or (gap_above is not None and gap_above <= gap_below):
            index -= 1
        bands[index:index + 2] = [(bands[index][0], bands[index + 1][1])]
    return bands


Blob = tuple[int, int, int, int, float, int]


def blobs_in_band(mask: list[list[bool]], top: int, bottom: int) -> list[Blob]:
    """8-connected blobs inside a band: bounding box, centre x and pixel count."""
    width = len(mask[0])
    seen = [[False] * width for _ in range(bottom - top)]
    blobs = []
    for start_y in range(top, bottom):
        for start_x in range(width):
            if not mask[start_y][start_x] or seen[start_y - top][start_x]:
                continue
            queue = deque([(start_x, start_y)])
            seen[start_y - top][start_x] = True
            left = right = start_x
            upper = lower = start_y
            total_x = count = 0
            while queue:
                x, y = queue.popleft()
                left, right = min(left, x), max(right, x)
                upper, lower = min(upper, y), max(lower, y)
                total_x += x
                count += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if (top <= ny < bottom and 0 <= nx < width and mask[ny][nx]
                                and not seen[ny - top][nx]):
                            seen[ny - top][nx] = True
                            queue.append((nx, ny))
            blobs.append((left, upper, right + 1, lower + 1, total_x / count, count))
    return blobs


def assign_columns(blobs: list[Blob], column_width: float, is_attack_row: bool) -> list[int]:
    """Column of every blob in a row.

    Blobs go by their centre. In the attack row a small blob between buildings is a shot that
    flew RIGHT out of its frame, so it belongs to the nearest building on its left, never further
    back than the previous column. The other rows hold the shot and impact frames on their own.
    """
    largest = max((blob[5] for blob in blobs), default=0)
    anchors = [blob for blob in blobs if blob[5] >= largest * ANCHOR_SHARE]
    columns = []
    for blob in blobs:
        own_column = min(COLUMNS - 1, int(blob[4] // column_width))
        if blob in anchors or not is_attack_row:
            columns.append(own_column)
            continue
        covering = [anchor for anchor in anchors if anchor[0] <= blob[4] <= anchor[2]]
        if covering:
            columns.append(min(COLUMNS - 1, int(covering[0][4] // column_width)))
            continue
        on_left = [anchor for anchor in anchors if anchor[2] <= blob[4]]
        nearest = max(on_left, key=lambda anchor: anchor[2], default=None)
        nearest_column = None if nearest is None else min(COLUMNS - 1, int(nearest[4] // column_width))
        if nearest_column is not None and own_column - 1 <= nearest_column <= own_column:
            columns.append(nearest_column)
        else:
            columns.append(own_column)
    return columns


def regrid_tower(source: Image.Image, mask: list[list[bool]], bands: list[tuple[int, int]]) -> Image.Image:
    """Lays one tower's three rows on an even 5x3 magenta grid, keeping each frame's position."""
    column_width = source.width / COLUMNS
    cells: dict[tuple[int, int], list[tuple[int, int, int, int]]] = {}
    for row, (top, bottom) in enumerate(bands):
        blobs = blobs_in_band(mask, top, bottom)
        is_attack_row = row == ATTACK_ROW
        for blob, column in zip(blobs, assign_columns(blobs, column_width, is_attack_row)):
            cells.setdefault((row, column), []).append(blob[:4])

    # Offsets are kept against the column's centre and the row's bottom, so a shot leaving the
    # tower stays where it was drawn and every frame of a row shares one baseline.
    half_width = 0.0
    height = 0
    for (row, column), boxes in cells.items():
        center = (column + 0.5) * column_width
        half_width = max(half_width, *(max(center - box[0], box[2] - center) for box in boxes))
        height = max(height, *(bands[row][1] - box[1] for box in boxes))
    cell_width = int(2 * half_width) + 2 * CELL_PADDING
    cell_height = height + 2 * CELL_PADDING

    grid = Image.new('RGB', (COLUMNS * cell_width, ROWS_PER_TOWER * cell_height), KEY)
    for (row, column), boxes in cells.items():
        center = (column + 0.5) * column_width
        for box in boxes:
            piece = source.crop(box)
            piece_mask = Image.new('L', piece.size, 0)
            mask_pixels = piece_mask.load()
            for y in range(piece.height):
                for x in range(piece.width):
                    if mask[box[1] + y][box[0] + x]:
                        mask_pixels[x, y] = 255
            x = column * cell_width + cell_width // 2 + int(box[0] - center)
            y = (row + 1) * cell_height - CELL_PADDING - (bands[row][1] - box[1])
            grid.paste(piece, (x, y), piece_mask)
    return grid


def main() -> None:
    parser = argparse.ArgumentParser(description='Split a two-tower generation into two tower sheets.')
    parser.add_argument('source', type=Path, help='raw generation: 5x6 grid on magenta, tower A on top')
    parser.add_argument('tower_a', help='sheet name of the top tower, e.g. undead_plague')
    parser.add_argument('tower_b', help='sheet name of the bottom tower, e.g. undead_frost_wyrm_nest')
    parser.add_argument('--fill-a', default='0.75', help='--fill for tower A (lower it for wide towers)')
    parser.add_argument('--fill-b', default='0.75', help='--fill for tower B')
    # Unknown options (--strip-ground, --keep-key-hue, ...) go to build-sprite-sheet.py for both.
    arguments, extra = parser.parse_known_args()

    source = Image.open(arguments.source).convert('RGB')
    mask = subject_mask(source)
    bands = merge_to_count(find_row_bands(mask), 2 * ROWS_PER_TOWER)
    if len(bands) != 2 * ROWS_PER_TOWER:
        sys.exit(f'{arguments.source}: found {len(bands)} rows, expected {2 * ROWS_PER_TOWER}')

    WORK_DIRECTORY.mkdir(parents=True, exist_ok=True)
    for name, tower_bands, fill in (
        (arguments.tower_a, bands[:ROWS_PER_TOWER], arguments.fill_a),
        (arguments.tower_b, bands[ROWS_PER_TOWER:], arguments.fill_b),
    ):
        regridded = WORK_DIRECTORY / f'{name}_grid.png'
        regrid_tower(source, mask, tower_bands).save(regridded)
        subprocess.run(
            [sys.executable, str(TOOLS_DIRECTORY / 'build-sprite-sheet.py'), str(regridded),
             str(TOWER_DIRECTORY / f'{name}.png'), '--grid', f'{COLUMNS}x{ROWS_PER_TOWER}',
             '--cell', '60', '--inset', '0', '--keep-x', '--fill', fill, *extra],
            check=True,
        )


if __name__ == '__main__':
    main()
