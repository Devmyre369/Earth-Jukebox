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



## 9. NASA Climate Spiral Visualization

### 9.1 Source

| Property | Details |
|---|---|
| Visualization | NASA Climate Spiral: 1880–Present |
| NASA Scientific Visualization Studio ID | 5190 |
| Publisher | NASA Goddard Space Flight Center |
| Official page | https://svs.gsfc.nasa.gov/5190 |
| Downloaded asset | GISTEMP_Spiral_English_degC_2160p60.mp4 |
| Local path | assets/nasa/GISTEMP_Spiral_English_degC_2160p60.mp4 |
| Format | MP4 |
| Video codec | H.264 / AVC |
| Resolution | 2160 × 2160 |
| Frame rate | 60 FPS |
| Duration | 30 seconds |
| Audio stream | None |

### 9.2 Download and Integrity Verification

The visualization was downloaded from the NASA Scientific Visualization Studio.

The downloaded video was verified using:

- MP4 container structure inspection.
- Verification of the `ftyp`, `mdat`, and `moov` boxes.
- Full video decoding through FFmpeg.
- Successful decoding of all 1,800 frames.
- FFmpeg exit code 0.

The final verified file size was 19,907,750 bytes.

### 9.3 Visual Inspection

Five preview frames were extracted at the following timestamps:

| Timestamp | Year displayed |
|---|---:|
| 0.0 seconds | 1880 |
| 7.5 seconds | 1927 |
| 15.0 seconds | 1974 |
| 22.5 seconds | 2021 |
| 29.0 seconds | Final horizontal timeline view |

The extracted frames were assembled into a contact sheet and visually inspected.

Observed characteristics:

- The visualization uses a circular, month-oriented climate spiral.
- Month labels are arranged around the circular layout.
- Temperature anomaly reference rings are visible.
- The spiral changes shape and colour as the displayed years progress.
- The final sampled frame transitions to a horizontal, year-labelled representation.

Visual inspection confirmed that the downloaded video is readable and suitable as a visual reference for the project.

### 9.4 Role in EARTH JUKEBOX

The NASA Climate Spiral will serve as a scientific visualization and visual storytelling component.

It can help users understand the historical progression of global temperature anomalies while listening to the corresponding sonification.

The visualization and the standardized NASA GISTEMP JSON dataset have different roles:

| Component | Role |
|---|---|
| NASA GISTEMP monthly JSON | Numerical source for scientific audio generation |
| NASA Climate Spiral MP4 | Visual representation of the climate record |
| EARTH JUKEBOX audio engine | Converts verified numerical measurements into sound |

### 9.5 Scientific and Technical Limitations

The video is a rendered visualization, not a raw numerical dataset.

EARTH JUKEBOX must follow these rules:

1. Never derive temperature anomaly values by sampling colours or pixels from the video.
2. Use the standardized GISTEMP JSON dataset as the numerical source for sonification.
3. Do not assume that one video frame corresponds to one monthly observation.
4. Do not assume a linear relationship between video timestamps and dataset dates without verifying the visualization's timing and frame mapping.
5. Do not use geographic stereo positioning for this global mean dataset because it does not provide geographically resolved measurements.
6. Clearly distinguish original scientific measurements from artistic audio transformations.

### 9.6 Preview Assets

Extracted preview frames are stored in:

`assets/nasa/preview_frames/`

The contact sheet is stored as:

`assets/nasa/preview_frames/contact_sheet.jpg`

The original downloaded video remains in:

`assets/nasa/GISTEMP_Spiral_English_degC_2160p60.mp4`
