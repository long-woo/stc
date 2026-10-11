export const isNewerVersion = (latest: string, current: string): boolean => {
  if (!/^\d+\.\d+\.\d+$/.test(latest)) return false;
  const a = latest.split(".").map(Number);
  const b = current.split("-")[0].split(".").map(Number);
  const index = a.findIndex((value, i) => value !== b[i]);
  return index === -1 ? current.includes("-") : a[index] > b[index];
};
