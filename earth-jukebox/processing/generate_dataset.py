
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

import pandas as pd


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parent.parent

RAW_FILE = (
    ROOT_DIR
    / "data"
    / "raw"
    / "gistemp_global_monthly.csv"
)

OUTPUT_DIR = ROOT_DIR / "data" / "processed"

OUTPUT_FILE = (
    OUTPUT_DIR / "global_temperature_monthly.json"
)

MONTHS = [
    "Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug",
    "Sep", "Oct", "Nov", "Dec"
]

MONTH_NAMES = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
]

SOURCE_URL = (
    "https://data.giss.nasa.gov/gistemp/tabledata_v4/"
    "GLB.Ts+dSST.csv"
)


# --------------------------------------------------
# SOURCE CHECKSUM
# --------------------------------------------------

def calculate_sha256(file_path):

    sha256 = hashlib.sha256()

    with file_path.open("rb") as file:
        for chunk in iter(
            lambda: file.read(8192),
            b""
        ):
            sha256.update(chunk)

    return sha256.hexdigest()


# --------------------------------------------------
# LOAD SOURCE DATA
# --------------------------------------------------

def load_source_data():

    if not RAW_FILE.exists():
        raise FileNotFoundError(
            f"NASA source file not found: {RAW_FILE}"
        )

    df = pd.read_csv(
        RAW_FILE,
        skiprows=1,
        na_values=["***"],
        dtype={"Year": "Int64"}
    )

    required_columns = ["Year"] + MONTHS

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    if df["Year"].isna().any():
        raise ValueError("Missing year values detected.")

    if df["Year"].duplicated().any():
        raise ValueError("Duplicate years detected.")

    return df


# --------------------------------------------------
# TRANSFORM INTO MONTHLY RECORDS
# --------------------------------------------------

def generate_monthly_records(df):

    records = []

    for _, row in df.iterrows():

        year = int(row["Year"])

        for month_index, month_column in enumerate(MONTHS):

            value = row[month_column]

            # Missing NASA observations are not converted
            # into zero or fabricated measurements.
            if pd.isna(value):
                continue

            value = float(value)

            record = {
                "time": (
                    f"{year}-{month_index + 1:02d}"
                ),
                "year": year,
                "month": month_index + 1,
                "month_name": MONTH_NAMES[month_index],
                "anomaly_celsius": value
            }

            records.append(record)

    records.sort(
        key=lambda record: record["time"]
    )

    if not records:
        raise ValueError(
            "No valid monthly records generated."
        )

    # Ensure the generated timeline is chronological.
    timestamps = [
        record["time"]
        for record in records
    ]

    if timestamps != sorted(timestamps):
        raise ValueError(
            "Monthly records are not chronological."
        )

    if len(timestamps) != len(set(timestamps)):
        raise ValueError(
            "Duplicate monthly timestamps detected."
        )

    return records


# --------------------------------------------------
# BUILD STANDARDIZED DATASET
# --------------------------------------------------

def build_dataset(df, records):

    source_checksum = calculate_sha256(RAW_FILE)

    dataset = {
        "dataset_id": "nasa_gistemp_global_temperature",

        "metadata": {
            "title": "NASA GISTEMP v4 Global Temperature Anomalies",
            "source": "NASA Goddard Institute for Space Studies",
            "source_url": SOURCE_URL,
            "measurement": "Global mean temperature anomaly",
            "unit": "degrees Celsius",
            "reference_period": "1951-1980",
            "temporal_resolution": "monthly",
            "coverage_start": records[0]["time"],
            "coverage_end": records[-1]["time"],
            "source_year_records": int(len(df)),
            "valid_monthly_observations": len(records),
            "missing_monthly_observations": (
                int(len(df) * 12 - len(records))
            ),
            "missing_value_policy": (
                "Missing observations are excluded, never replaced with zero."
            ),
            "source_file": RAW_FILE.name,
            "source_sha256": source_checksum,
            "generated_at_utc": datetime.now(
                timezone.utc
            ).isoformat()
        },

        "records": records
    }

    return dataset


# --------------------------------------------------
# SAVE DATASET
# --------------------------------------------------

def save_dataset(dataset):

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    temporary_file = OUTPUT_FILE.with_suffix(".tmp")

    temporary_file.write_text(
        json.dumps(
            dataset,
            indent=4,
            allow_nan=False
        ),
        encoding="utf-8"
    )

    temporary_file.replace(OUTPUT_FILE)


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    print("=" * 65)
    print("EARTH JUKEBOX - STANDARDIZED DATASET GENERATOR")
    print("=" * 65)

    print("\n1. Loading NASA source data...")

    df = load_source_data()

    print(f"PASS: {len(df)} annual records loaded.")

    print("\n2. Transforming monthly observations...")

    records = generate_monthly_records(df)

    print(
        f"PASS: {len(records)} monthly observations generated."
    )

    print("\n3. Building standardized dataset...")

    dataset = build_dataset(
        df,
        records
    )

    print("\n4. Saving JSON dataset...")

    save_dataset(dataset)

    print("\n" + "=" * 65)
    print("DATASET GENERATION COMPLETED")
    print("=" * 65)

    print(f"Dataset ID: {dataset['dataset_id']}")
    print(f"First observation: {records[0]['time']}")
    print(f"Last observation: {records[-1]['time']}")
    print(f"Total observations: {len(records)}")

    print(
        "Missing observations:",
        dataset["metadata"]["missing_monthly_observations"]
    )

    print(f"\nSaved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
