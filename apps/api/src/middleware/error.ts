import { FastifyError } from "fastify";
import { FastifyReply, FastifyRequest } from "fastify";

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = request.id as string;

  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.message,
    },
    requestId,
  };

  if (process.env.NODE_ENV === "production" && !error.validation) {
    response.error.message = "Internal Server Error";
  }

  reply.code(error.statusCode || 500).send(response);
}