
from pathlib import Path
import requests

url = (
    "https://svs.gsfc.nasa.gov/vis/a000000/a005100/"
    "a005190/GISTEMP_Spiral_English_degC_2160p60.mp4"
)

destination = Path(
    "assets/nasa/GISTEMP_Spiral_English_degC_2160p60.mp4"
)

temporary_file = destination.with_suffix(".mp4.part")

print("Connecting to NASA...")

with requests.get(
    url,
    stream=True,
    timeout=(20, 120)
) as response:

    response.raise_for_status()

    if response.status_code != 200:
        raise RuntimeError(
            f"Unexpected HTTP status: {response.status_code}"
        )

    expected_size = int(
        response.headers.get("Content-Length", 0)
    )

    if expected_size == 0:
        raise RuntimeError(
            "NASA did not provide a valid Content-Length."
        )

    downloaded = 0

    print("Expected size:", expected_size, "bytes")
    print("Downloading...")

    with temporary_file.open("wb") as file:
        for chunk in response.iter_content(
            chunk_size=1024 * 1024
        ):
            if chunk:
                file.write(chunk)
                downloaded += len(chunk)

                percentage = downloaded / expected_size * 100

                print(
                    f"\rDownloaded: {downloaded:,} bytes "
                    f"({percentage:.1f}%)",
                    end="",
                    flush=True
                )

print()

actual_size = temporary_file.stat().st_size

if actual_size != expected_size:
    raise RuntimeError(
        f"Download incomplete. Expected {expected_size:,} "
        f"bytes, received {actual_size:,} bytes. "
        "Original file has been preserved."
    )

temporary_file.replace(destination)

print("\nDownload verified successfully.")
print("Final file:", destination)
print("Final size:", f"{actual_size:,} bytes")
