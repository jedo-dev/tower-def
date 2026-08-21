"""Cuts a generated contact sheet into a game-ready sprite sheet.

The image models return a grid of frames on a flat magenta background, at whatever size they
feel like, with the subject floating at a different scale and height in every cell. The game
needs the opposite: fixed cells, one shared scale, feet on one baseline, alpha instead of magenta.

Usage:
    python tools/build-sprite-sheet.py raw.png src/shared/sprite/orc_grunt.png --grid 4x4 --cell 32
    python tools/build-sprite-sheet.py raw.png public/assets/towers/orc_tar_pit.png --grid 5x3 --cell 60

Creep sheet: --grid 4x4 --cell 32   -> 128x128 (rows: down, side, up, death)
Tower sheet: --grid 5x3 --cell 60   -> 300x180 (15 slots)
"""
import argparse
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover - environment guard
    sys.exit('Pillow is required: pip install pillow')

def parse_grid(value: str) -> tuple[int, int]:
    columns, _, rows = value.lower().partition('x')
    return int(columns), int(rows)


def key_out_background(cell: Image.Image, tolerance: int, background: tuple[int, int, int]) -> Image.Image:
    """Replaces the flat background with alpha, keeping the sprite's own colours intact."""
    cell = cell.convert('RGBA')
    pixels = cell.load()
    width, height = cell.size

    for y in range(height):
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            close_enough = (
                abs(red - background[0]) <= tolerance
                and abs(green - background[1]) <= tolerance
                and abs(blue - background[2]) <= tolerance
            )
            if close_enough:
                pixels[x, y] = (0, 0, 0, 0)

    return cell


def drop_stray_pixels(cell: Image.Image, min_neighbours: int = 2) -> Image.Image:
    """Kills lone opaque pixels left by the border lines and by keying noise."""
    pixels = cell.load()
    width, height = cell.size
    doomed = []

    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] == 0:
                continue
            neighbours = 0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height and pixels[nx, ny][3] > 0:
                        neighbours += 1
            if neighbours < min_neighbours:
                doomed.append((x, y))

    for x, y in doomed:
        pixels[x, y] = (0, 0, 0, 0)

    return cell


def main() -> None:
    parser = argparse.ArgumentParser(description='Cut a generated contact sheet into a game sprite sheet.')
    parser.add_argument('source', help='raw generation, e.g. a 1024x1024 grid on magenta')
    parser.add_argument('target', help='where to write the finished sheet')
    parser.add_argument('--grid', default='4x4', help='columns x rows of the source grid (default 4x4)')
    parser.add_argument('--cell', type=int, default=32, help='size of one output frame in pixels (default 32)')
    parser.add_argument('--inset', type=float, default=0.03,
                        help='share of a cell trimmed off each side before analysis, kills drawn borders (default 0.03)')
    parser.add_argument('--tolerance', type=int, default=60, help='how far a pixel may sit from the key colour (default 60)')
    parser.add_argument('--fill', type=float, default=0.88,
                        help='share of the frame height the tallest subject fills (default 0.88)')
    parser.add_argument('--margin-bottom', type=int, default=1, help='empty pixels under the baseline (default 1)')
    parser.add_argument('--key', default='ff00ff', help='background colour to remove, hex (default ff00ff)')
    parser.add_argument('--normalize-rows', default='',
                        help='rows that get their own scale, e.g. "0,1,2" for the three walk rows; '
                             'a row that is not listed inherits the scale of the nearest listed row above it. '
                             'Empty means one shared scale for the whole sheet.')
    args = parser.parse_args()

    columns, rows = parse_grid(args.grid)
    key_hex = args.key.lstrip('#')
    background = tuple(int(key_hex[index:index + 2], 16) for index in (0, 2, 4))

    source = Image.open(args.source).convert('RGBA')
    cell_width = source.width / columns
    cell_height = source.height / rows
    inset_x = cell_width * args.inset
    inset_y = cell_height * args.inset

    cells: list[list[dict]] = []
    for row in range(rows):
        row_cells = []
        for column in range(columns):
            box = (
                int(column * cell_width + inset_x),
                int(row * cell_height + inset_y),
                int((column + 1) * cell_width - inset_x),
                int((row + 1) * cell_height - inset_y),
            )
            cell = drop_stray_pixels(key_out_background(source.crop(box), args.tolerance, background))
            bbox = cell.getbbox()
            row_cells.append({'image': cell, 'bbox': bbox})
        cells.append(row_cells)

    def subject_height(entry: dict) -> int:
        return 0 if entry['bbox'] is None else entry['bbox'][3] - entry['bbox'][1]

    target_height = args.cell - args.margin_bottom
    tallest_overall = max((subject_height(entry) for row_cells in cells for entry in row_cells), default=0)
    shared_scale = (target_height * args.fill) / tallest_overall if tallest_overall else 1.0

    normalized_rows = {int(value) for value in args.normalize_rows.split(',') if value.strip() != ''}
    scales: list[float] = []
    for row_index, row_cells in enumerate(cells):
        if row_index in normalized_rows:
            tallest = max((subject_height(entry) for entry in row_cells), default=0)
            scales.append((target_height * args.fill) / tallest if tallest else shared_scale)
        elif scales:
            # A row nobody normalised keeps the scale above it, so a lying corpse in the
            # death row is not inflated to the height of a standing walk pose.
            scales.append(scales[-1])
        else:
            scales.append(shared_scale)

    sheet = Image.new('RGBA', (columns * args.cell, rows * args.cell), (0, 0, 0, 0))
    placed = 0
    oversized: list[str] = []

    for row_index, row_cells in enumerate(cells):
        scale = scales[row_index]
        for column_index, entry in enumerate(row_cells):
            if entry['bbox'] is None:
                continue

            subject = entry['image'].crop(entry['bbox'])
            width = max(1, round(subject.width * scale))
            height = max(1, round(subject.height * scale))

            # A pose that still overflows its cell is shrunk rather than cropped.
            if height > args.cell - args.margin_bottom or width > args.cell:
                fit = min((args.cell - args.margin_bottom) / height, args.cell / width)
                width = max(1, round(width * fit))
                height = max(1, round(height * fit))
                oversized.append(f'r{row_index}c{column_index}')
            # Lanczos keeps the shapes; the alpha is re-hardened afterwards so edges stay crisp.
            subject = subject.resize((width, height), Image.LANCZOS)
            alpha = subject.split()[3].point(lambda value: 255 if value >= 128 else 0)
            subject.putalpha(alpha)

            offset_x = column_index * args.cell + (args.cell - width) // 2
            offset_y = (row_index + 1) * args.cell - args.margin_bottom - height
            sheet.alpha_composite(subject, (offset_x, max(row_index * args.cell, offset_y)))
            placed += 1

    sheet.save(args.target)
    print(f'{args.target}: {sheet.width}x{sheet.height}, кадров с содержимым {placed}/{columns * rows}')
    if oversized:
        print('ужаты, чтобы влезть в ячейку: ' + ', '.join(oversized))


if __name__ == '__main__':
    main()
