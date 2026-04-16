export function sortBy(items, key, direction = "asc") {
  return [...items].sort((left, right) => {
    const a = left[key];
    const b = right[key];

    if (a === b) return 0;
    if (a == null) return direction === "asc" ? -1 : 1;
    if (b == null) return direction === "asc" ? 1 : -1;

    return (a > b ? 1 : -1) * (direction === "asc" ? 1 : -1);
  });
}
