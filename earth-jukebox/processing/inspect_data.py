
from pathlib import Path
import csv


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = (
    ROOT_DIR
    / "data"
    / "raw"
    / "gistemp_global_monthly.csv"
)


# --------------------------------------------------
# INSPECTION
# --------------------------------------------------

def inspect_dataset():

    print("=" * 65)
    print("EARTH JUKEBOX - NASA GISTEMP DATA INSPECTOR")
    print("=" * 65)

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}"
        )

    with DATA_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        lines = file.readlines()

    print(f"\nFile: {DATA_FILE.name}")
    print(f"Total lines: {len(lines)}")
    print(f"File size: {DATA_FILE.stat().st_size:,} bytes")

    print("\n" + "=" * 65)
    print("FIRST 15 LINES")
    print("=" * 65)

    for number, line in enumerate(lines[:15], start=1):
        print(f"{number:02d}: {line.rstrip()}")

    print("\n" + "=" * 65)
    print("LAST 10 LINES")
    print("=" * 65)

    for line in lines[-10:]:
        print(line.rstrip())

    print("\n" + "=" * 65)
    print("CSV STRUCTURE")
    print("=" * 65)

    # Locate the actual CSV header, ignoring preceding comments.
    header_index = next(
        (
            index
            for index, line in enumerate(lines)
            if line.strip().lower().startswith("year,")
        ),
        None
    )

    if header_index is None:
        print("\nWARNING: CSV header beginning with 'Year,' not found.")
        print("We need to inspect the downloaded file format.")
        return

    csv_content = "".join(lines[header_index:])

    reader = csv.DictReader(csv_content.splitlines())

    print("\nColumns:")

    for column in reader.fieldnames or []:
        print(f"- {column}")

    rows = list(reader)

    print(f"\nData records found: {len(rows)}")

    if rows:
        print("\nFirst data record:")
        print(rows[0])

        print("\nLast data record:")
        print(rows[-1])

    print("\nInspection completed.")


# --------------------------------------------------
# MAIN
# --------------------------------------------------

if __name__ == "__main__":
    inspect_dataset()
