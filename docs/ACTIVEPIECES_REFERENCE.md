# ActivePieces Piece-Declaration Framework: Structural Reference Study

**Document Type:** Architectural Reference & Specification Study  
**Scope:** ActivePieces Core Piece Framework (`packages/pieces/framework` & `packages/core/piece-types`)  
**Licensing & Boundaries:** ActivePieces MIT Core only. Strictly excludes `packages/ee` (non-MIT/Enterprise). Zero connector imports. No canvas code modifications.

---

## 1. Executive Summary & Context

This reference study analyzes ActivePieces' core piece declaration pattern to serve as the design foundation for the future connector layer (Phase 4). ActivePieces organizes integrations into modular, self-contained packages called **"pieces"**. Each piece encapsulates authentication requirements, input property declarations, and executable actions/triggers.

In contrast to Rivet's port-based, fine-grained data-flow graph contract (`NodeBase`, `PortDefinition`, `NodeConnection`), ActivePieces implements an action/step-oriented execution model. This study analyzes the syntax, type contracts, authentication abstractions, and execution lifecycle of ActivePieces, contrasting it directly with the TypeScript Node Contract established in Step 1.

---

## 2. ActivePieces Framework Architecture

The core framework resides in `packages/pieces/framework` and `packages/core/piece-types` within the ActivePieces codebase. It consists of four fundamental pillars:

```
┌────────────────────────────────────────────────────────┐
│                        Piece                           │
│  (displayName, logoUrl, auth, actions, triggers)       │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       ┌────────▼───────┐        ┌───────▼────────┐
       │     Action     │        │    Trigger     │
       │ (props, run)   │        │ (poll/webhook) │
       └────────┬───────┘        └───────┬────────┘
                │                        │
       ┌────────▼────────────────────────▼────────┐
       │             Property & Auth              │
       │ (Property.ShortText, PieceAuth.OAuth2)   │
       └──────────────────────────────────────────┘
```

---

## 3. The Piece Declaration Contract (`createPiece`)

A piece represents a complete integration namespace (e.g., Slack, GitHub, Postgres, Google Sheets). It is declared using the `createPiece` builder function:

```typescript
// Sourced from ActivePieces packages/pieces/framework/src/lib/piece.ts (MIT License)
export const createPiece = <PieceAuth extends PieceAuthProperty | PieceAuthProperty[] | undefined>(
  params: CreatePieceParams<PieceAuth>
): Piece<PieceAuth> => {
  // Enforces unique auth type declarations
  if (params.auth && Array.isArray(params.auth)) {
    const isUnique = params.auth.every((auth, index, self) =>
      index === self.findIndex((t) => t.type === auth.type)
    );
    if (!isUnique) {
      throw new Error('Auth properties must be unique by type');
    }
  }
  return new Piece<PieceAuth>(
    params.displayName,
    params.logoUrl,
    params.authors ?? [],
    params.events,
    params.actions,
    params.triggers,
    params.categories ?? [],
    params.auth,
    params.minimumSupportedRelease,
    params.maximumSupportedRelease,
    params.description,
    params.deprecated,
  );
};
```

### Key Piece Attributes
- `displayName`: Human-readable label displayed in node palettes and step configurations.
- `logoUrl`: Absolute or asset URL to SVG/PNG brand icon.
- `auth`: Declares the credential requirements needed to execute actions in this piece.
- `actions`: Array of discrete API calls or operations (`Action[]`).
- `triggers`: Array of event sources (`Trigger[]`), either webhook-based or polling-based.
- `categories`: High-level taxonomy tags (`PieceCategory.COMMUNICATION`, `PieceCategory.CORE`, etc.).

---

## 4. Authentication Declaration Model (`PieceAuth`)

ActivePieces abstracts third-party authentication into strongly-typed `PieceAuth` declarations (`packages/pieces/framework/src/lib/property/authentication/index.ts`). Authentication is declared at the piece level and automatically passed into action/trigger execution contexts.

### Supported Authentication Types

| Auth Type | Factory Method | Target Use Case | Example Fields |
| :--- | :--- | :--- | :--- |
| **Secret Text** | `PieceAuth.SecretText()` | API keys, Bearer tokens, private secrets | `displayName: 'API Key'`, `required: true` |
| **OAuth2** | `PieceAuth.OAuth2()` | Provider OAuth authorization code flow | `authUrl`, `tokenUrl`, `scope`, `extra` |
| **Basic Auth** | `PieceAuth.BasicAuth()` | Username + Password credentials | `username`, `password` |
| **Custom Auth** | `PieceAuth.CustomAuth()` | Multi-field custom credential schemas | Dictionary of custom `Property.*` fields |
| **OIDC** | `PieceAuth.OIDC()` | OpenID Connect identity provider | `issuer`, `clientId`, `clientSecret` |
| **None** | `PieceAuth.None()` | Unauthenticated APIs / Utilities | `undefined` |

### Sample Declaration
```typescript
export const slackAuth = PieceAuth.OAuth2({
  displayName: 'Slack Connection',
  authUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  required: true,
  scope: ['channels:read', 'chat:write', 'chat:write.public'],
});
```

---

## 5. Input Property Declaration Model (`Property.*`)

ActivePieces provides a rich set of typed input properties declared in `packages/pieces/framework/src/lib/property/index.ts`. Each property defines validation, UI widget rendering, default values, and dynamic option loading.

### Input Types Catalog

1. **Primitive Text Inputs**:
   - `Property.ShortText({ displayName, required, defaultValue })` - Single-line text field.
   - `Property.LongText({ displayName, required })` - Multi-line textarea or Markdown editor.
   - `Property.Number({ displayName, required })` - Numerical input with min/max constraints.
   - `Property.Checkbox({ displayName, defaultValue })` - Boolean toggle.
2. **Structured & Dynamic Inputs**:
   - `Property.StaticDropdown({ displayName, options: { options: [...] } })` - Hardcoded dropdown list.
   - `Property.Dropdown({ displayName, refreshers: ['auth'], options: async (propsValue) => [...] })` - Dynamically populated dropdown that refetches options when upstream auth or dependencies change.
   - `Property.MultiSelectDropdown({ ... })` - Multi-value dropdown selector.
   - `Property.Json({ displayName, required })` - Raw JSON payload input with syntax validation.
   - `Property.Array({ displayName, properties: { ... } })` - Repeating collection of structured fields.
   - `Property.Object({ displayName })` - Arbitrary key-value map.
   - `Property.DynamicProperties({ refreshers: [...], props: async (propsValue) => [...] })` - Schema loaded at runtime based on upstream selections (e.g. fetching custom fields from a CRM object).

---

## 6. Action Declaration Contract (`createAction`)

Actions represent executable tasks within a piece. They are declared with `createAction` (`packages/pieces/framework/src/lib/action/action.ts`):

```typescript
export const sendMessageAction = createAction({
  name: 'send_message',
  displayName: 'Send Channel Message',
  description: 'Post a message to a designated channel',
  props: {
    channel: Property.Dropdown({
      displayName: 'Channel',
      required: true,
      refreshers: [],
      options: async ({ auth }) => {
        // Dynamic fetch of channels using piece auth
        return { options: [{ label: 'General', value: 'C12345' }] };
      },
    }),
    text: Property.LongText({
      displayName: 'Message Text',
      required: true,
    }),
  },
  async run(context) {
    const { auth, propsValue } = context;
    // Execution using resolved auth token and evaluated inputs
    const response = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: 'https://slack.com/api/chat.postMessage',
      headers: { Authorization: `Bearer ${auth.access_token}` },
      body: { channel: propsValue.channel, text: propsValue.text },
    });
    return response.body;
  },
  async test(context) {
    // Optional dry-run / validation hook
    return this.run(context);
  }
});
```

### Action Execution Context (`ActionContext`)
Inside `run(ctx)`:
- `ctx.auth`: The decrypted, active authentication payload matching the piece's `PieceAuth`.
- `ctx.propsValue`: Fully resolved key-value mapping of all properties declared in `props`.
- `ctx.files`: Binary file storage helper for streaming files/attachments.
- `ctx.store`: Flow-scoped and project-scoped persistent key-value cache.
- `ctx.server`: Server webhook and callback URLs.

---

## 7. Comparative Analysis: ActivePieces vs. Rivet Node Contract

| Dimension | Rivet Node Contract (Our Foundation) | ActivePieces Piece Framework |
| :--- | :--- | :--- |
| **Execution Topology** | Fine-grained Directed Acyclic Graph (DAG) with port-to-port wires | Step-by-step sequential or linear flow execution with branching |
| **Input/Output Mechanism** | Named Ports (`PortDefinition`, `PortId`) with strictly typed `DataValue` | Property dictionary (`InputPropertyMap`) and JSON return payload |
| **Authentication** | Externalized to environment variables, graph inputs, or node config payload | First-class `PieceAuth` declarations with connection management & OAuth token lifecycle |
| **Data Propagation** | Wire-based: data flows across explicit wires from source port to destination port | Variable resolution: downstream steps reference `{{step_1.output.id}}` |
| **Code Modifiability** | Langflow editable-node-code pattern: runtime editable TypeScript source per node | Pre-compiled package actions; dynamic behaviors confined to code pieces |
| **Dynamic Fields** | Dynamic ports enabled via flags (`isConditional`, input port arrays) | Dynamic properties loaded via asynchronous `refreshers` hooks |
| **Granularity** | Low-level primitives: `ExtractRegexNode`, `ChunkNode`, `MatchNode`, `LoopControllerNode` | High-level business actions: `CreateIssue`, `SendEmail`, `ChargeCard` |
| **Serialization** | Lossless YAML flow storage (`FlowGraph`, `ChartNode[]`, `NodeConnection[]`) | JSON-based Flow Version model (`FlowVersion`, `Step`, `ActionStep`) |

---

## 8. Design Blueprint for Phase 4 Connector Layer

When bridging ActivePieces piece patterns into our Rivet canvas in Phase 4, the following architectural mapping should be applied:

1. **Piece Action as a Rivet Node**:
   - Each piece action (e.g. `slack.send_message`) maps to a custom Rivet node type: `type: "piece:slack:send_message"`.
   - Action `props` map to input ports:
     - `Property.ShortText` / `LongText` -> `NodeInputDefinition` of dataType `'string'`.
     - `Property.Number` -> `NodeInputDefinition` of dataType `'number'`.
     - `Property.Json` / `Object` -> `NodeInputDefinition` of dataType `'object'`.
   - The action's return schema maps to output ports (e.g. `output`, `status`, `response`).

2. **Connection Injection Pattern**:
   - Rather than embedding credentials directly in graph node data, authentication will be handled via a dedicated `ConnectionManager` bridge.
   - Nodes reference a connection ID (`connectionId: string`), and the runner injects resolved auth tokens into the execution context.

3. **Dynamic Dropdowns via Debugger Bridge**:
   - ActivePieces' dynamic property dropdowns (`Property.Dropdown` with `refreshers`) will utilize the websocket Debugger Bridge to resolve options in the editor.

---

## 9. License & IP Boundary Verification

- **ActivePieces Core**: Licensed under MIT (`packages/core`, `packages/pieces/framework`, `packages/server/api`).
- **Enterprise Restrictions (`packages/ee`)**: Strictly non-MIT (commercial/enterprise). **No code, dependencies, or schemas from `packages/ee` have been or will be imported.**
- **Connector Library Scope**: The 734 community connector packages in `packages/pieces/community` remain untouched for this step. Phase 4 will introduce connectors via clean, contract-compliant TypeScript wrappers.
