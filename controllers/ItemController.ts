import api from "@/services/api/api";

export class ItemController {
  constructor() {}

  async get() {
    const { data } = await api.get("products/1");
    return data;
  }
}
