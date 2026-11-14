
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

import requests


# --------------------------------------------------
# PROJECT CONFIGURATION
# --------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parent.parent

RAW_DIR = ROOT_DIR / "data" / "raw"
METADATA_DIR = ROOT_DIR / "data" / "metadata"

RAW_DIR.mkdir(parents=True, exist_ok=True)
METADATA_DIR.mkdir(parents=True, exist_ok=True)

DATASET_URL = (
    "https://data.giss.nasa.gov/"
    "gistemp/tabledata_v4/GLB.Ts+dSST.csv"
)

OUTPUT_FILE = RAW_DIR / "gistemp_global_monthly.csv"
METADATA_FILE = METADATA_DIR / "download_metadata.json"


# --------------------------------------------------
# DOWNLOAD FUNCTION
# --------------------------------------------------

def download_dataset():

    print("=" * 60)
    print("EARTH JUKEBOX - NASA DATA DOWNLOADER")
    print("=" * 60)

    print("\nConnecting to NASA GISTEMP server...")

    try:
        response = requests.get(
            DATASET_URL,
            timeout=(15, 90),
            headers={
                "User-Agent": "EarthJukebox/1.0"
            }
        )

        response.raise_for_status()

        content = response.content

        if not content:
            raise ValueError("NASA returned an empty response.")

        # Prevent saving an HTML error page as a CSV.
        if content.lstrip().lower().startswith(
            (b"<!doctype html", b"<html")
        ):
            raise ValueError(
                "Received an HTML page instead of the CSV dataset."
            )

        # Calculate a checksum for file integrity.
        sha256_hash = hashlib.sha256(content).hexdigest()

        # Save to a temporary file first.
        temporary_file = OUTPUT_FILE.with_suffix(".csv.part")
        temporary_file.write_bytes(content)

        # Replace the final file only after successful download.
        temporary_file.replace(OUTPUT_FILE)

        # Create download metadata.
        metadata = {
            "dataset_id": "global_temperature",
            "dataset_name": "NASA GISTEMP v4",
            "organization": "NASA Goddard Institute for Space Studies",
            "source_url": DATASET_URL,
            "downloaded_at": datetime.now(
                timezone.utc
            ).isoformat(),
            "filename": OUTPUT_FILE.name,
            "file_size_bytes": len(content),
            "sha256": sha256_hash,
            "format": "CSV",
            "download_status": "success"
        }

        METADATA_FILE.write_text(
            json.dumps(metadata, indent=4),
            encoding="utf-8"
        )

        print("\nDOWNLOAD SUCCESSFUL")
        print("-" * 60)

        print(f"Dataset: {OUTPUT_FILE.name}")
        print(f"Size: {len(content):,} bytes")
        print(f"SHA256: {sha256_hash}")
        print(f"Saved to: {OUTPUT_FILE}")
        print(f"Metadata: {METADATA_FILE}")

        print("\nNASA DATA ACQUISITION COMPLETED!")

    except requests.RequestException as error:

        print("\nDOWNLOAD FAILED")
        print(f"Network error: {error}")
        raise

    except (ValueError, OSError) as error:

        print("\nDATA ACQUISITION FAILED")
        print(f"Error: {error}")
        raise


# --------------------------------------------------
# MAIN ENTRY POINT
# --------------------------------------------------

if __name__ == "__main__":
    download_dataset()
