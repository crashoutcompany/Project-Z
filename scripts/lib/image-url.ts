export function deriveImageUrl(setCode: string, number: number): string {
  const pad = String(number).padStart(3, "0");
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${setCode}/${setCode}_${pad}_EN_SM.webp`;
}

export function fullSizeUrl(imageUrl: string): string {
  return imageUrl.replace(/_SM\.webp$/, ".webp");
}
