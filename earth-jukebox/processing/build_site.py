from __future__ import annotations

import json
import math
import shutil
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT_DIR / "web"
DATA_FILE = ROOT_DIR / "data" / "processed" / "global_temperature_monthly.json"
DIST_DIR = ROOT_DIR / "dist"
WEB_FILES = ("index.html", "styles.css", "app.js")


def validate_dataset(dataset: object) -> None:
    if not isinstance(dataset, dict):
        raise ValueError("NASA dataset JSON must contain a top-level object.")

    metadata = dataset.get("metadata")
    records = dataset.get("records")
    if not isinstance(metadata, dict) or not isinstance(records, list) or not records:
        raise ValueError("NASA dataset must include metadata and monthly records.")

    previous_time = ""
    for index, record in enumerate(records, start=1):
        if not isinstance(record, dict):
            raise ValueError(f"NASA dataset record {index} must be an object.")
        if not isinstance(record.get("time"), str) or record["time"] <= previous_time:
            raise ValueError(f"NASA dataset record {index} is not in chronological order.")
        year = record.get("year")
        month = record.get("month")
        if (
            not isinstance(year, int)
            or isinstance(year, bool)
            or not isinstance(month, int)
            or isinstance(month, bool)
            or not 1 <= month <= 12
        ):
            raise ValueError(f"NASA dataset record {index} has an invalid date.")
        anomaly = record.get("anomaly_celsius")
        if (
            not isinstance(anomaly, (int, float))
            or isinstance(anomaly, bool)
            or not math.isfinite(anomaly)
        ):
            raise ValueError(f"NASA dataset record {index} has no numeric anomaly.")
        previous_time = record["time"]


def build() -> None:
    for filename in WEB_FILES:
        if not (WEB_DIR / filename).is_file():
            raise FileNotFoundError(f"Required web file is missing: {WEB_DIR / filename}")

    if not DATA_FILE.is_file():
        raise FileNotFoundError(
            "The standardized NASA GISTEMP JSON is missing. "
            "Generate it from the preserved source CSV with "
            "'python -m processing.generate_dataset'."
        )

    with DATA_FILE.open("r", encoding="utf-8") as file:
        dataset = json.load(file)
    validate_dataset(dataset)

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    for filename in WEB_FILES:
        shutil.copy2(WEB_DIR / filename, DIST_DIR / filename)

    output_data = DIST_DIR / "data" / "processed" / DATA_FILE.name
    output_data.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(DATA_FILE, output_data)

    print(f"Built EARTH JUKEBOX in {DIST_DIR}")
    print(f"Validated and bundled {len(dataset['records']):,} NASA GISTEMP observations.")


if __name__ == "__main__":
    build()
