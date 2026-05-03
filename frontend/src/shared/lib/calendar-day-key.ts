/** Ключ дня в локальном календаре (как в прежнем мок-слое). */
export function dayKeyRu(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
