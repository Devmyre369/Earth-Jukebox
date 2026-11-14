# EARTH JUKEBOX — Scientific Data Sources

## 1. Primary Dataset: NASA GISTEMP v4

| Property | Details |
|---|---|
| Dataset | GISTEMP v4 |
| Publisher | NASA Goddard Institute for Space Studies (GISS) |
| Measurement | Global mean land-ocean temperature anomaly |
| Unit | Degrees Celsius (°C) |
| Reference period | 1951–1980 |
| Temporal resolution | Monthly |
| Historical coverage in downloaded file | January 1880 – October 2026 |
| Source format | CSV |
| Local source file | `data/raw/gistemp_global_monthly.csv` |

**Official source:**  
https://data.giss.nasa.gov/gistemp/data_v4.html

**Downloaded CSV:**  
https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv

## 2. Scientific Meaning

The dataset contains global temperature anomalies relative to the 1951–1980 reference period.

An anomaly represents the difference between the observed temperature and the corresponding reference-period average. It is not an absolute temperature measurement.

Positive values indicate warmer-than-reference conditions, while negative values indicate cooler-than-reference conditions.

## 3. Data Processing

The original NASA CSV is preserved without modification.

Processing is performed using Python and Pandas.

Processing steps:

1. Load the original CSV, skipping its title line.
2. Identify the year and twelve monthly measurement columns.
3. Interpret `***` as a missing observation.
4. Convert available monthly measurements into numerical values.
5. Validate years, duplicate records, and numerical values.
6. Convert annual rows into chronological monthly records.
7. Preserve original anomaly values without replacing missing measurements with zero.
8. Export the standardized dataset as JSON.

## 4. Local Dataset Files

| File | Purpose |
|---|---|
| `data/raw/gistemp_global_monthly.csv` | Original NASA dataset |
| `data/metadata/download_metadata.json` | Download timestamp, file size, and SHA256 checksum |
| `data/metadata/validation_report.json` | Dataset validation results |
| `data/processed/global_temperature_monthly.json` | Standardized monthly observations |

## 5. Current Dataset Validation

Results from the downloaded source file:

- Annual records: 147
- Historical coverage: 1880–2026
- Valid monthly observations: 1,762
- Missing monthly observations: 2
- Latest available observations: January–October 2026

The missing observations correspond to November and December 2026 in the downloaded file.

## 6. Data Integrity

Source-file SHA256:

`a7b1939db2e7e484c798e925e0f07f8184356c52ac0e7ce264adcd0f25e81253`

The standardized JSON retains the original monthly anomaly values and records the source checksum in its metadata.

## 7. Scientific and Sonification Limitations

- The dataset provides global monthly measurements, not geographically resolved measurements.
- It cannot independently support geographic stereo positioning.
- The temperature anomaly values must not be interpreted as absolute temperatures.
- Missing measurements must not be synthesized or treated as zero.
- Any conversion of scientific values into pitch, rhythm, or timbre is an artistic sonification mapping, not a change in the underlying scientific measurement.
- The NASA visualization and dataset must be checked for consistency before claiming exact frame-to-data synchronization.

## 8. Attribution

Temperature data sourced from NASA Goddard Institute for Space Studies, GISTEMP v4.

Official documentation:  
https://data.giss.nasa.gov/gistemp/data_v4.html
