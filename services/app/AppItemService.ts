import { fetchGet } from "@/lib/api";

export const get = async () => {
  const result = await fetchGet("/api/item");
  return result;
};
