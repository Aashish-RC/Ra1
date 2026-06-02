import { FastifyPluginAsync } from "fastify";

const SPINE_NODES = [
  { id: "node-orchestrator", nodeType: "orchestrator", classification: "fixed", status: "live", label: "Orchestrator", description: "Central coordination. Every task passes through here.", position: { x: 400, y: 150 } },
  { id: "node-model-hub", nodeType: "model-hub", classification: "fixed", status: "live", label: "Model", description: "Central model registry. All model providers connect here.", position: { x: 400, y: 320 } },
  { id: "node-memory-hub", nodeType: "memory-hub", classification: "fixed", status: "live", label: "Memory", description: "Memory palace. 4 tiers, 5 lanes, full knowledge governance.", position: { x: 160, y: 235 } },
  { id: "node-connector-hub", nodeType: "connector-hub", classification: "fixed", status: "live", label: "Connectors", description: "All external connections. Apps, APIs, MCP servers.", position: { x: 640, y: 235 } },
  { id: "node-credential-vault", nodeType: "credential-vault", classification: "fixed", status: "live", label: "Vault", description: "Encrypted credential store. Never exposed, always resolved at call time.", position: { x: 400, y: 490 } },
];

export const spineRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/nodes/spine", async () => {
    return SPINE_NODES;
  });
};