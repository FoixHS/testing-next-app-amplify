// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { ItemController } from "@/controllers/ItemController";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const result = await new ItemController().get();
  return res.status(200).json(result);
}
