export default function sizeFormatter(size: number) {
  let unit = "b";
  if (size > 1024) {
    size /= 1024;
    unit = "kb";

    if (size > 1024) {
      size /= 1024;
      unit = "mb";
    }
  }

  return size.toFixed(2) + unit;
}
