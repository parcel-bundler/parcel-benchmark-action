export default function median(numbers: Array<number>) {
  let sorted = numbers.sort((a, b) => a - b);
  
  return sorted[Math.floor(sorted.length / 2)];
}
