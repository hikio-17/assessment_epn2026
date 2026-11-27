export function formatRupiah(value: number): string {
  return `Rp ${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function formatDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}