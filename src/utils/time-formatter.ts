export default function timeFormatter(size: number) {
  let unit = "ms";
  if (size > 1000) {
    size /= 1000;
    unit = "s";

    if (size > 60) {
      size /= 60;
      unit = "m";
    }
  }

  return size.toFixed(2) + unit;
}
