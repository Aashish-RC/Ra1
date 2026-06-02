import { secrets } from "../config/secrets";

export interface OllamaClient {
  health(): Promise<boolean>;
  generateEmbedding(text: string): Promise<number[]>;
}

class OllamaClientImpl implements OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = secrets.OLLAMA_BASE_URL.replace(/\/$/, "");
    this.model = secrets.EMBEDDING_MODEL;
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ps`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: text }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`);
    }

    const data = await response.json() as { embeddings: number[][] };
    return data.embeddings[0] ?? [];
  }
}

let client: OllamaClientImpl;

export async function connect(): Promise<void> {
  client = new OllamaClientImpl();
}

export async function disconnect(): Promise<void> {
  client = null as unknown as OllamaClientImpl;
}

export { client };