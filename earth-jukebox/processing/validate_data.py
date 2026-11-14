
from pathlib import Path
import json

import numpy as np
import pandas as pd


# --------------------------------------------------
# PROJECT CONFIGURATION
# --------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = (
    ROOT_DIR
    / "data"
    / "raw"
    / "gistemp_global_monthly.csv"
)

REPORT_DIR = ROOT_DIR / "data" / "metadata"

REPORT_FILE = REPORT_DIR / "validation_report.json"

MONTHS = [
    "Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug",
    "Sep", "Oct", "Nov", "Dec"
]


# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

def load_dataset():

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"NASA dataset not found: {DATA_FILE}"
        )

    # The first line contains the dataset title.
    # The second line contains the actual CSV header.
    df = pd.read_csv(
        DATA_FILE,
        skiprows=1,
        na_values=["***"],
        dtype={"Year": "Int64"}
    )

    return df


# --------------------------------------------------
# VALIDATE STRUCTURE
# --------------------------------------------------

def validate_structure(df):

    required_columns = ["Year"] + MONTHS

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    if df.empty:
        raise ValueError("Dataset contains no records.")

    return True


# --------------------------------------------------
# VALIDATE OBSERVATIONS
# --------------------------------------------------


def validate_observations(df):

    monthly = df[MONTHS].apply(
        pd.to_numeric,
        errors="coerce"
    )

    years = pd.to_numeric(
        df["Year"],
        errors="coerce"
    )

    # Check year values.
    if years.isna().any():
        raise ValueError(
            "Invalid or missing year values found."
        )

    # Check duplicate years.
    if years.duplicated().any():
        duplicates = years[years.duplicated()].tolist()

        raise ValueError(
            f"Duplicate years found: {duplicates}"
        )

    # Convert monthly measurements to a NumPy array.
    values = monthly.to_numpy(
        dtype=float,
        na_value=np.nan
    )

    # Missing values (NaN) are allowed.
    # Infinite values are not allowed.
    if np.isinf(values).any():
        raise ValueError(
            "Infinite measurements found."
        )

    # Count actual available observations.
    valid_values = monthly.stack().dropna()

    if valid_values.empty:
        raise ValueError(
            "No valid monthly measurements found."
        )

    return monthly, years

# --------------------------------------------------
# GENERATE VALIDATION REPORT
# --------------------------------------------------

def generate_report(df, monthly, years):

    missing_count = int(monthly.isna().sum().sum())

    total_monthly_slots = int(
        monthly.shape[0] * monthly.shape[1]
    )

    valid_count = total_monthly_slots - missing_count

    latest_year = int(years.max())

    latest_year_row = monthly.loc[
        years.idxmax()
    ]

    available_latest_months = [
        month
        for month in MONTHS
        if pd.notna(latest_year_row[month])
    ]

    report = {
        "dataset": "NASA GISTEMP v4",
        "measurement": "Global temperature anomaly",
        "unit": "degrees Celsius",
        "reference_period": "1951-1980",
        "total_year_records": int(len(df)),
        "first_year": int(years.min()),
        "last_year": latest_year,
        "monthly_columns": MONTHS,
        "total_monthly_slots": total_monthly_slots,
        "valid_monthly_observations": valid_count,
        "missing_monthly_observations": missing_count,
        "missing_value_marker": "***",
        "latest_year_available_months": (
            available_latest_months
        ),
        "statistics": {
            "minimum_anomaly": float(valid_count and monthly.min().min()),
            "maximum_anomaly": float(monthly.max().max()),
            "mean_anomaly": float(monthly.stack().mean())
        },
        "validation_status": "passed"
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    REPORT_FILE.write_text(
        json.dumps(report, indent=4),
        encoding="utf-8"
    )

    return report


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    print("=" * 65)
    print("EARTH JUKEBOX - DATA VALIDATION ENGINE")
    print("=" * 65)

    df = load_dataset()

    print("\n1. Checking dataset structure...")

    validate_structure(df)

    print("PASS: Required columns found.")

    print("\n2. Checking observations...")

    monthly, years = validate_observations(df)

    print("PASS: Years and monthly values checked.")

    print("\n3. Generating validation report...")

    report = generate_report(
        df,
        monthly,
        years
    )

    print("\n" + "=" * 65)
    print("VALIDATION RESULTS")
    print("=" * 65)

    print(f"Year range: {report['first_year']} - {report['last_year']}")
    print(f"Year records: {report['total_year_records']}")
    print(f"Valid monthly observations: {report['valid_monthly_observations']}")
    print(f"Missing monthly observations: {report['missing_monthly_observations']}")

    print(
        "Latest year available months:",
        ", ".join(report["latest_year_available_months"])
    )

    print("\nStatistics:")

    for key, value in report["statistics"].items():
        print(f"{key}: {value:.4f}")

    print("\nValidation status:", report["validation_status"])
    print("Report saved to:", REPORT_FILE)


if __name__ == "__main__":
    main()
