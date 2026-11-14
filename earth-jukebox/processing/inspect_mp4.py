
from pathlib import Path
import struct

video_path = Path(
    "assets/nasa/GISTEMP_Spiral_English_degC_2160p60.mp4"
)

data = video_path.read_bytes()

print("Total bytes:", len(data))
print("First 64 bytes:", data[:64].hex(" "))
print("Last 64 bytes:", data[-64:].hex(" "))

print("\nTop-level MP4 boxes:")

position = 0

while position + 8 <= len(data):
    size, box_type = struct.unpack_from(">I4s", data, position)

    box_name = box_type.decode("ascii", errors="replace")

    print(
        f"Offset {position}: "
        f"{box_name}, declared size {size}"
    )

    if size == 1:
        if position + 16 > len(data):
            print("Incomplete extended box header.")
            break

        size = struct.unpack_from(
            ">Q", data, position + 8
        )[0]

    elif size == 0:
        size = len(data) - position

    if size < 8:
        print("Invalid MP4 box size.")
        break

    if position + size > len(data):
        print(
            "Incomplete MP4 box. Expected end:",
            position + size
        )
        break

    position += size

print("\nInspection complete.")
