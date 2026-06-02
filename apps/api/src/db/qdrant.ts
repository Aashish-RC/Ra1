import { QdrantClient } from "@qdrant/js-client-rest";
import { secrets } from "../config/secrets";

let client: QdrantClient;

export async function connect(): Promise<void> {
  client = new QdrantClient({
    url: secrets.QDRANT_URL,
  });
}

export async function disconnect(): Promise<void> {
  // QdrantClient doesn't expose a close method - cleanup is implicit
}

export { client };