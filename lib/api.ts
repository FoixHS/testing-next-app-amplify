import type { NextApiRequest, NextApiResponse } from "next";
import {
  InferType,
  ObjectSchema,
  Maybe,
  AnyObject,
  object,
  string,
  number,
} from "yup";

export class NotFoundControllerError extends Error {
  constructor() {
    super("Not Found");
  }
}

export class NotImplementedControllerError extends Error {
  constructor() {
    super("Not Implemented");
  }
}

export class FetchRequestError extends Error {
  constructor(public readonly response: Response, message: string) {
    super(message);
  }
}

export const ApiPagingDataSchema = object({
  cursor: string().optional(),
  limit: number().optional().default(50),
});

export const fetchGet = async (url: string) => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json;charset=UTF-8",
    },
  });
  if (response.status >= 300) {
    throw new FetchRequestError(response, `Error fetching from ${url}`);
  }
  return response.json();
};

export const fetchPost = async (url: string, data: any) => {
  return await fetchPostOrPut("POST", url, data);
};

export const fetchPut = async (url: string, data: any) => {
  return await fetchPostOrPut("PUT", url, data);
};

export const fetchPostOrPut = async (
  method: "POST" | "PUT",
  url: string,
  data: any
) => {
  const response = await fetch(url, {
    method: method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify(data),
  });
  if (response.status >= 300) {
    throw new FetchRequestError(response, `Error fetching from ${url}`);
  }
  return response.json();
};

export const ApiReturns = {
  ok: { ok: true },
  error: { ok: false },
  notFound: { ok: false, message: "Not Found" },
};

export type ApiCallbackContext<T = any> = {
  input: T;
  req: NextApiRequest;
  res: NextApiResponse;
};

export type ApiMethods = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";

export type RequestHandler = {
  schema: ObjectSchema<any>;
  callback: (ctx: ApiCallbackContext<any>) => Promise<any>;
};

export class ApiBuilder {
  public readonly requests: { [name: string]: RequestHandler } = {};
  method<T extends Maybe<AnyObject>>(
    method: ApiMethods,
    schema: ObjectSchema<T>,
    callback: (
      ctx: ApiCallbackContext<InferType<typeof schema>>
    ) => Promise<any>
  ) {
    this.requests[method] = {
      schema: schema,
      callback: callback,
    };
    return this;
  }
  post<T extends Maybe<AnyObject>>(
    schema: ObjectSchema<T>,
    callback: (
      ctx: ApiCallbackContext<InferType<typeof schema>>
    ) => Promise<any>
  ) {
    return this.method("POST", schema, callback);
  }
  get<T extends Maybe<AnyObject>>(
    schema: ObjectSchema<T>,
    callback: (
      ctx: ApiCallbackContext<InferType<typeof schema>>
    ) => Promise<any>
  ) {
    return this.method("GET", schema, callback);
  }
  put<T extends Maybe<AnyObject>>(
    schema: ObjectSchema<T>,
    callback: (
      ctx: ApiCallbackContext<InferType<typeof schema>>
    ) => Promise<any>
  ) {
    return this.method("PUT", schema, callback);
  }
  build() {
    const requests = this.requests;
    return async function handler(req: NextApiRequest, res: NextApiResponse) {
      const request = requests[req.method as string];
      if (!request) {
        return res.status(405).json(ApiReturns.error);
      }
      type RequestType = InferType<typeof request.schema>;
      let input: RequestType | undefined;
      try {
        input = await request.schema.validate({ ...req.query, ...req.body });
      } catch (error: any) {
        return res.status(400).json({ ...ApiReturns.error, error: error });
      }
      try {
        return await request.callback({
          input: input as RequestType,
          req: req,
          res: res,
        });
      } catch (error: any) {
        if (error instanceof NotFoundControllerError) {
          return res.status(404).json(ApiReturns.notFound);
        }
        if (error instanceof NotImplementedControllerError) {
          return res.status(405).json(ApiReturns.error);
        }
        return res.status(500).json(ApiReturns.error);
      }
    };
  }
}
