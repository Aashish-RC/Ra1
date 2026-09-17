# Merged Built-In Nodes Catalog & File Reconciliation

This document provides a comprehensive inventory of all **109 built-in node implementations** merged from Ironclad Rivet (`github.com/Ironclad/rivet` - MIT License), reconciles the file counts across `backend/nodes/`, and formally documents the scope status of each node group.

---

## 1. File Count & Inventory Reconciliation

A complete audit of `backend/nodes/` shows **118 total files** (117 files across 4 subdirectories + 1 master registry file). These files are classified into three distinct functional tiers:

1. **Node Implementations (109 files)**: Executable node definitions across three directories:
   - `backend/nodes/core/`: **84 files** (encompassing Rivet's core flow, chat, data, files, MCP, media, and utility nodes)
   - `backend/nodes/assistants/`: **15 files** (OpenAI Assistants API integration nodes)
   - `backend/nodes/plugins/`: **10 files** (Provider-specific integrated plugin nodes)
2. **Contract & Schema Interfaces (8 files)**: Located in `backend/nodes/contract/` (`NodeBase.ts`, `PortDefinition.ts`, `NodeConnection.ts`, `NodeDefinition.ts`, `NodeImpl.ts`, `NodeRegistration.ts`, `DataValue.ts`, and `index.ts`). These files define the TypeScript interfaces, abstract base classes, port specifications, and runtime data representations. **They are interface schemas, not node implementations, and are intentionally excluded from the node count.**
3. **Master Catalog Registry (1 file)**: Located at `backend/nodes/allNodes.ts`. This file aggregates and exports the runtime node catalog and metadata for the frontend palette and runtime engine.

$$\text{Total Files (118)} = 109\text{ Node Implementations} + 8\text{ Contract Interfaces} + 1\text{ Registry File}$$

---

## 2. Summary by Category

The **109 node implementations** map into 9 functional categories. The category sums below reconcile with both the underlying file counts and the numbered catalog in Section 3:

| Category | Node Count | Directory Path | Scope Classification | Description |
|---|---|---|---|---|
| **1. Graph & Flow Control** | 14 | `backend/nodes/core/` | In Scope (Phase 1) | Subgraphs, conditional branching, loops, races, and flow termination |
| **2. Chat & Language Models** | 9 | `backend/nodes/core/` | In Scope (Phase 1) | Chat execution, base model handler, prompt assembly, message trimming, and loops |
| **3. Data Manipulation** | 26 | `backend/nodes/core/` | In Scope (Phase 1) | JSON, YAML, Regex, Objects, Arrays, math, booleans, and tables |
| **4. Files, Datasets & Vectors** | 13 | `backend/nodes/core/` | In Scope (Phase 1) | File I/O, vector stores, nearest neighbors, and dataset rows |
| **5. OpenAI Assistants** | 15 | `backend/nodes/assistants/` | In Scope (Phase 1) | Complete OpenAI Assistants API (threads, messages, runs, files) |
| **6. Model Context Protocol (MCP)** | 3 | `backend/nodes/core/` | In Scope (Phase 1) | Tool discovery, prompt retrieval, and tool execution |
| **7. Media & Audio** | 3 | `backend/nodes/core/` | In Scope (Phase 1) | Audio playback, audio loading, and image handling |
| **8. Utility & System** | 16 | `backend/nodes/core/` | In Scope (Phase 1) | Code execution, context, globals, events, HTTP, cron, delay |
| **9. Integrated Plugins** | 10 | `backend/nodes/plugins/` | **Unscoped Scope Addition** | Anthropic, Google, Hugging Face, AssemblyAI, and AutoEvals |
| **Total Node Implementations** | **109** | | | **Full Rivet node inventory (84 core + 15 assistants + 10 plugins)** |
| *Contract Schemas & Interfaces* | *8* | `backend/nodes/contract/` | *Foundational* | *Interface definitions (excluded from node count)* |
| *Master Node Registry* | *1* | `backend/nodes/allNodes.ts` | *Registry* | *Master catalog index and palette registry* |
| **Total Files in backend/nodes/** | **118** | | | **117 files in subdirectories + 1 registry file** |

---

## 3. Complete Numbered Node Directory & Upstream Source Mapping

Every one of the **109 node implementations** is cataloged and numbered below (#1 to #109):

### 1. Graph & Flow Control (14 Nodes)
*Directory: `backend/nodes/core/`*

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 1 | SubGraphNode | `subGraph` | `backend/nodes/core/SubGraphNode.ts` | `packages/core/src/model/nodes/SubGraphNode.ts` |
| 2 | GraphInputNode | `graphInput` | `backend/nodes/core/GraphInputNode.ts` | `packages/core/src/model/nodes/GraphInputNode.ts` |
| 3 | GraphOutputNode | `graphOutput` | `backend/nodes/core/GraphOutputNode.ts` | `packages/core/src/model/nodes/GraphOutputNode.ts` |
| 4 | CallGraphNode | `callGraph` | `backend/nodes/core/CallGraphNode.ts` | `packages/core/src/model/nodes/CallGraphNode.ts` |
| 5 | ListGraphsNode | `listGraphs` | `backend/nodes/core/ListGraphsNode.ts` | `packages/core/src/model/nodes/ListGraphsNode.ts` |
| 6 | GraphReferenceNode | `graphReference` | `backend/nodes/core/GraphReferenceNode.ts` | `packages/core/src/model/nodes/GraphReferenceNode.ts` |
| 7 | ReferencedGraphAliasNode | `referencedGraphAlias` | `backend/nodes/core/ReferencedGraphAliasNode.ts` | `packages/core/src/model/nodes/ReferencedGraphAliasNode.ts` |
| 8 | IfNode | `if` | `backend/nodes/core/IfNode.ts` | `packages/core/src/model/nodes/IfNode.ts` |
| 9 | IfElseNode | `ifElse` | `backend/nodes/core/IfElseNode.ts` | `packages/core/src/model/nodes/IfElseNode.ts` |
| 10 | MatchNode | `match` | `backend/nodes/core/MatchNode.ts` | `packages/core/src/model/nodes/MatchNode.ts` |
| 11 | LoopControllerNode | `loopController` | `backend/nodes/core/LoopControllerNode.ts` | `packages/core/src/model/nodes/LoopControllerNode.ts` |
| 12 | LoopUntilNode | `loopUntil` | `backend/nodes/core/LoopUntilNode.ts` | `packages/core/src/model/nodes/LoopUntilNode.ts` |
| 13 | AbortGraphNode | `abortGraph` | `backend/nodes/core/AbortGraphNode.ts` | `packages/core/src/model/nodes/AbortGraphNode.ts` |
| 14 | RaceInputsNode | `raceInputs` | `backend/nodes/core/RaceInputsNode.ts` | `packages/core/src/model/nodes/RaceInputsNode.ts` |

### 2. Chat & Models (9 Nodes)
*Directory: `backend/nodes/core/`*

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 15 | ChatNode | `chat` | `backend/nodes/core/ChatNode.ts` | `packages/core/src/model/nodes/ChatNode.ts` |
| 16 | ChatNodeBase | `chatBase` | `backend/nodes/core/ChatNodeBase.ts` | `packages/core/src/model/nodes/ChatNodeBase.ts` |
| 17 | ChatLoopNode | `chatLoop` | `backend/nodes/core/ChatLoopNode.ts` | `packages/core/src/model/nodes/ChatLoopNode.ts` |
| 18 | PromptNode | `prompt` | `backend/nodes/core/PromptNode.ts` | `packages/core/src/model/nodes/PromptNode.ts` |
| 19 | AssemblePromptNode | `assemblePrompt` | `backend/nodes/core/AssemblePromptNode.ts` | `packages/core/src/model/nodes/AssemblePromptNode.ts` |
| 20 | AssembleMessageNode | `assembleMessage` | `backend/nodes/core/AssembleMessageNode.ts` | `packages/core/src/model/nodes/AssembleMessageNode.ts` |
| 21 | TrimChatMessagesNode | `trimChatMessages` | `backend/nodes/core/TrimChatMessagesNode.ts` | `packages/core/src/model/nodes/TrimChatMessagesNode.ts` |
| 22 | ToolNode (gptFunction) | `gptFunction` | `backend/nodes/core/ToolNode.ts` | `packages/core/src/model/nodes/ToolNode.ts` |
| 23 | DelegateFunctionCallNode | `delegateFunctionCall` | `backend/nodes/core/DelegateFunctionCallNode.ts` | `packages/core/src/model/nodes/DelegateFunctionCallNode.ts` |

### 3. Data Manipulation (26 Nodes)
*Directory: `backend/nodes/core/`*

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 24 | ArrayNode | `array` | `backend/nodes/core/ArrayNode.ts` | `packages/core/src/model/nodes/ArrayNode.ts` |
| 25 | ObjectNode | `object` | `backend/nodes/core/ObjectNode.ts` | `packages/core/src/model/nodes/ObjectNode.ts` |
| 26 | DestructureNode | `destructure` | `backend/nodes/core/DestructureNode.ts` | `packages/core/src/model/nodes/DestructureNode.ts` |
| 27 | ExtractJsonNode | `extractJson` | `backend/nodes/core/ExtractJsonNode.ts` | `packages/core/src/model/nodes/ExtractJsonNode.ts` |
| 28 | ExtractYamlNode | `extractYaml` | `backend/nodes/core/ExtractYamlNode.ts` | `packages/core/src/model/nodes/ExtractYamlNode.ts` |
| 29 | ExtractRegexNode | `extractRegex` | `backend/nodes/core/ExtractRegexNode.ts` | `packages/core/src/model/nodes/ExtractRegexNode.ts` |
| 30 | ExtractObjectPathNode | `extractObjectPath` | `backend/nodes/core/ExtractObjectPathNode.ts` | `packages/core/src/model/nodes/ExtractObjectPathNode.ts` |
| 31 | ExtractMarkdownCodeBlocksNode | `extractMarkdownCodeBlocks` | `backend/nodes/core/ExtractMarkdownCodeBlocksNode.ts` | `packages/core/src/model/nodes/ExtractMarkdownCodeBlocksNode.ts` |
| 32 | ChunkNode | `chunk` | `backend/nodes/core/ChunkNode.ts` | `packages/core/src/model/nodes/ChunkNode.ts` |
| 33 | SliceNode | `slice` | `backend/nodes/core/SliceNode.ts` | `packages/core/src/model/nodes/SliceNode.ts` |
| 34 | SplitNode | `split` | `backend/nodes/core/SplitNode.ts` | `packages/core/src/model/nodes/SplitNode.ts` |
| 35 | JoinNode | `join` | `backend/nodes/core/JoinNode.ts` | `packages/core/src/model/nodes/JoinNode.ts` |
| 36 | FilterNode | `filter` | `backend/nodes/core/FilterNode.ts` | `packages/core/src/model/nodes/FilterNode.ts` |
| 37 | CoalesceNode | `coalesce` | `backend/nodes/core/CoalesceNode.ts` | `packages/core/src/model/nodes/CoalesceNode.ts` |
| 38 | BooleanNode | `boolean` | `backend/nodes/core/BooleanNode.ts` | `packages/core/src/model/nodes/BooleanNode.ts` |
| 39 | CompareNode | `compare` | `backend/nodes/core/CompareNode.ts` | `packages/core/src/model/nodes/CompareNode.ts` |
| 40 | EvaluateNode | `evaluate` | `backend/nodes/core/EvaluateNode.ts` | `packages/core/src/model/nodes/EvaluateNode.ts` |
| 41 | NumberNode | `number` | `backend/nodes/core/NumberNode.ts` | `packages/core/src/model/nodes/NumberNode.ts` |
| 42 | RandomNumberNode | `randomNumber` | `backend/nodes/core/RandomNumberNode.ts` | `packages/core/src/model/nodes/RandomNumberNode.ts` |
| 43 | ShuffleNode | `shuffle` | `backend/nodes/core/ShuffleNode.ts` | `packages/core/src/model/nodes/ShuffleNode.ts` |
| 44 | HashNode | `hash` | `backend/nodes/core/HashNode.ts` | `packages/core/src/model/nodes/HashNode.ts` |
| 45 | ToJsonNode | `toJson` | `backend/nodes/core/ToJsonNode.ts` | `packages/core/src/model/nodes/ToJsonNode.ts` |
| 46 | ToYamlNode | `toYaml` | `backend/nodes/core/ToYamlNode.ts` | `packages/core/src/model/nodes/ToYamlNode.ts` |
| 47 | ToMarkdownTableNode | `toMarkdownTable` | `backend/nodes/core/ToMarkdownTableNode.ts` | `packages/core/src/model/nodes/ToMarkdownTableNode.ts` |
| 48 | ToTreeNode | `toTree` | `backend/nodes/core/ToTreeNode.ts` | `packages/core/src/model/nodes/ToTreeNode.ts` |
| 49 | PopNode | `pop` | `backend/nodes/core/PopNode.ts` | `packages/core/src/model/nodes/PopNode.ts` |

### 4. Files, Datasets & Vectors (13 Nodes)
*Directory: `backend/nodes/core/`*

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 50 | ReadFileNode | `readFile` | `backend/nodes/core/ReadFileNode.ts` | `packages/core/src/model/nodes/ReadFileNode.ts` |
| 51 | ReadDirectoryNode | `readDirectory` | `backend/nodes/core/ReadDirectoryNode.ts` | `packages/core/src/model/nodes/ReadDirectoryNode.ts` |
| 52 | ReadAllFilesNode | `readAllFiles` | `backend/nodes/core/ReadAllFilesNode.ts` | `packages/core/src/model/nodes/ReadAllFilesNode.ts` |
| 53 | CreateDatasetNode | `createDataset` | `backend/nodes/core/CreateDatasetNode.ts` | `packages/core/src/model/nodes/CreateDatasetNode.ts` |
| 54 | LoadDatasetNode | `loadDataset` | `backend/nodes/core/LoadDatasetNode.ts` | `packages/core/src/model/nodes/LoadDatasetNode.ts` |
| 55 | AppendToDatasetNode | `appendToDataset` | `backend/nodes/core/AppendToDatasetNode.ts` | `packages/core/src/model/nodes/AppendToDatasetNode.ts` |
| 56 | GetAllDatasetsNode | `getAllDatasets` | `backend/nodes/core/GetAllDatasetsNode.ts` | `packages/core/src/model/nodes/GetAllDatasetsNode.ts` |
| 57 | GetDatasetRowNode | `getDatasetRow` | `backend/nodes/core/GetDatasetRowNode.ts` | `packages/core/src/model/nodes/GetDatasetRowNode.ts` |
| 58 | ReplaceDatasetNode | `replaceDataset` | `backend/nodes/core/ReplaceDatasetNode.ts` | `packages/core/src/model/nodes/ReplaceDatasetNode.ts` |
| 59 | DatasetNearestNeighborsNode | `datasetNearestNeighbors` | `backend/nodes/core/DatasetNearestNeigborsNode.ts` | `packages/core/src/model/nodes/DatasetNearestNeigborsNode.ts` |
| 60 | VectorStoreNode | `vectorStore` | `backend/nodes/core/VectorStoreNode.ts` | `packages/core/src/model/nodes/VectorStoreNode.ts` |
| 61 | VectorNearestNeighborsNode | `vectorNearestNeighbors` | `backend/nodes/core/VectorNearestNeighborsNode.ts` | `packages/core/src/model/nodes/VectorNearestNeighborsNode.ts` |
| 62 | GetEmbeddingNode | `getEmbedding` | `backend/nodes/core/GetEmbeddingNode.ts` | `packages/core/src/model/nodes/GetEmbeddingNode.ts` |

### 5. OpenAI Assistants Nodes (15 Nodes)
*Directory: `backend/nodes/assistants/`*

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 63 | CreateAssistantNode | `createAssistant` | `backend/nodes/assistants/CreateAssistantNode.ts` | `packages/core/src/plugins/openai/nodes/CreateAssistantNode.ts` |
| 64 | GetAssistantNode | `getAssistant` | `backend/nodes/assistants/GetAssistantNode.ts` | `packages/core/src/plugins/openai/nodes/GetAssistantNode.ts` |
| 65 | ListAssistantsNode | `listAssistants` | `backend/nodes/assistants/ListAssistantsNode.ts` | `packages/core/src/plugins/openai/nodes/ListAssistantsNode.ts` |
| 66 | DeleteAssistantNode | `deleteAssistant` | `backend/nodes/assistants/DeleteAssistantNode.ts` | `packages/core/src/plugins/openai/nodes/DeleteAssistantNode.ts` |
| 67 | AttachAssistantFileNode | `attachAssistantFile` | `backend/nodes/assistants/AttachAssistantFileNode.ts` | `packages/core/src/plugins/openai/nodes/AttachAssistantFileNode.ts` |
| 68 | CreateThreadNode | `createThread` | `backend/nodes/assistants/CreateThreadNode.ts` | `packages/core/src/plugins/openai/nodes/CreateThreadNode.ts` |
| 69 | GetThreadNode | `getThread` | `backend/nodes/assistants/GetThreadNode.ts` | `packages/core/src/plugins/openai/nodes/GetThreadNode.ts` |
| 70 | DeleteThreadNode | `deleteThread` | `backend/nodes/assistants/DeleteThreadNode.ts` | `packages/core/src/plugins/openai/nodes/DeleteThreadNode.ts` |
| 71 | CreateThreadMessageNode | `createThreadMessage` | `backend/nodes/assistants/CreateThreadMessageNode.ts` | `packages/core/src/plugins/openai/nodes/CreateThreadMessageNode.ts` |
| 72 | ThreadMessageNode | `threadMessage` | `backend/nodes/assistants/ThreadMessageNode.ts` | `packages/core/src/plugins/openai/nodes/ThreadMessageNode.ts` |
| 73 | ListThreadMessagesNode | `listThreadMessages` | `backend/nodes/assistants/ListThreadMessagesNode.ts` | `packages/core/src/plugins/openai/nodes/ListThreadMessagesNode.ts` |
| 74 | RunThreadNode | `runThread` | `backend/nodes/assistants/RunThreadNode.ts` | `packages/core/src/plugins/openai/nodes/RunThreadNode.ts` |
| 75 | UploadFileNode | `uploadFile` | `backend/nodes/assistants/UploadFileNode.ts` | `packages/core/src/plugins/openai/nodes/UploadFileNode.ts` |
| 76 | GetOpenAIFileNode | `getOpenAIFile` | `backend/nodes/assistants/GetOpenAIFileNode.ts` | `packages/core/src/plugins/openai/nodes/GetOpenAIFileNode.ts` |
| 77 | ListOpenAIFilesNode | `listOpenAIFiles` | `backend/nodes/assistants/ListOpenAIFilesNode.ts` | `packages/core/src/plugins/openai/nodes/ListOpenAIFilesNode.ts` |

### 6. Model Context Protocol (MCP) (3 Nodes)
*Directory: `backend/nodes/core/`*

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 78 | MCPDiscoveryNode | `mcpDiscovery` | `backend/nodes/core/MCPDiscoveryNode.ts` | `packages/core/src/model/nodes/MCPDiscoveryNode.ts` |
| 79 | MCPGetPromptNode | `mcpGetPrompt` | `backend/nodes/core/MCPGetPromptNode.ts` | `packages/core/src/model/nodes/MCPGetPromptNode.ts` |
| 80 | MCPToolCallNode | `mcpToolCall` | `backend/nodes/core/MCPToolCallNode.ts` | `packages/core/src/model/nodes/MCPToolCallNode.ts` |

### 7. Media & Audio (3 Nodes)
*Directory: `backend/nodes/core/`*

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 81 | ImageNode | `image` | `backend/nodes/core/ImageNode.ts` | `packages/core/src/model/nodes/ImageNode.ts` |
| 82 | AudioNode | `audio` | `backend/nodes/core/AudioNode.ts` | `packages/core/src/model/nodes/AudioNode.ts` |
| 83 | PlayAudioNode | `playAudio` | `backend/nodes/core/PlayAudioNode.ts` | `packages/core/src/model/nodes/PlayAudioNode.ts` |

### 8. Utility & System (16 Nodes)
*Directory: `backend/nodes/core/`*

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 84 | CodeNode | `code` | `backend/nodes/core/CodeNode.ts` | `packages/core/src/model/nodes/CodeNode.ts` |
| 85 | CommentNode | `comment` | `backend/nodes/core/CommentNode.ts` | `packages/core/src/model/nodes/CommentNode.ts` |
| 86 | ContextNode | `context` | `backend/nodes/core/ContextNode.ts` | `packages/core/src/model/nodes/ContextNode.ts` |
| 87 | CronNode | `cron` | `backend/nodes/core/CronNode.ts` | `packages/core/src/model/nodes/CronNode.ts` |
| 88 | DelayNode | `delay` | `backend/nodes/core/DelayNode.ts` | `packages/core/src/model/nodes/DelayNode.ts` |
| 89 | DocumentNode | `document` | `backend/nodes/core/DocumentNode.ts` | `packages/core/src/model/nodes/DocumentNode.ts` |
| 90 | ExternalCallNode | `externalCall` | `backend/nodes/core/ExternalCallNode.ts` | `packages/core/src/model/nodes/ExternalCallNode.ts` |
| 91 | GetGlobalNode | `getGlobal` | `backend/nodes/core/GetGlobalNode.ts` | `packages/core/src/model/nodes/GetGlobalNode.ts` |
| 92 | SetGlobalNode | `setGlobal` | `backend/nodes/core/SetGlobalNode.ts` | `packages/core/src/model/nodes/SetGlobalNode.ts` |
| 93 | HttpCallNode | `httpCall` | `backend/nodes/core/HttpCallNode.ts` | `packages/core/src/model/nodes/HttpCallNode.ts` |
| 94 | PassthroughNode | `passthrough` | `backend/nodes/core/PassthroughNode.ts` | `packages/core/src/model/nodes/PassthroughNode.ts` |
| 95 | RaiseEventNode | `raiseEvent` | `backend/nodes/core/RaiseEventNode.ts` | `packages/core/src/model/nodes/RaiseEventNode.ts` |
| 96 | TextNode | `text` | `backend/nodes/core/TextNode.ts` | `packages/core/src/model/nodes/TextNode.ts` |
| 97 | URLReferenceNode | `urlReference` | `backend/nodes/core/URLReferenceNode.ts` | `packages/core/src/model/nodes/URLReferenceNode.ts` |
| 98 | UserInputNode | `userInput` | `backend/nodes/core/UserInputNode.ts` | `packages/core/src/model/nodes/UserInputNode.ts` |
| 99 | WaitForEventNode | `waitForEvent` | `backend/nodes/core/WaitForEventNode.ts` | `packages/core/src/model/nodes/WaitForEventNode.ts` |

### 9. Core Integrated Plugin Nodes (10 Nodes)
*Directory: `backend/nodes/plugins/`*

> **Scope Note**: These 10 provider-specific plugin nodes (Anthropic, Google, Hugging Face, AssemblyAI/Lemur, AutoEvals) were not part of the original Phase 1 scope (which covered Rivet's 8 general-purpose node categories) — they're carried forward as an unscoped addition, kept per project policy of deferring removal decisions until working inside the relevant subsystem, not yet formally reviewed against our model-engine/connector-layer plans.

| # | Node Name | Type Identifier | Implementation File | Sourced From Rivet Upstream |
|---|---|---|---|---|
| 100 | ChatAnthropicNode | `chatAnthropic` | `backend/nodes/plugins/ChatAnthropicNode.ts` | `packages/core/src/plugins/anthropic/nodes/ChatAnthropicNode.ts` |
| 101 | ChatGoogleNode | `chatGoogle` | `backend/nodes/plugins/ChatGoogleNode.ts` | `packages/core/src/plugins/google/nodes/ChatGoogleNode.ts` |
| 102 | ChatHuggingFace | `chatHuggingFace` | `backend/nodes/plugins/ChatHuggingFace.ts` | `packages/core/src/plugins/huggingface/nodes/ChatHuggingFace.ts` |
| 103 | TextToImageHuggingFace | `textToImageHuggingFace` | `backend/nodes/plugins/TextToImageHuggingFace.ts` | `packages/core/src/plugins/huggingface/nodes/TextToImageHuggingFace.ts` |
| 104 | TranscribeAudioNode | `transcribeAudio` | `backend/nodes/plugins/TranscribeAudioNode.ts` | `packages/core/src/plugins/assemblyAi/TranscribeAudioNode.ts` |
| 105 | LemurSummaryNode | `lemurSummary` | `backend/nodes/plugins/LemurSummaryNode.ts` | `packages/core/src/plugins/assemblyAi/LemurSummaryNode.ts` |
| 106 | LemurQaNode | `lemurQa` | `backend/nodes/plugins/LemurQaNode.ts` | `packages/core/src/plugins/assemblyAi/LemurQaNode.ts` |
| 107 | LemurActionItemsNode | `lemurActionItems` | `backend/nodes/plugins/LemurActionItemsNode.ts` | `packages/core/src/plugins/assemblyAi/LemurActionItemsNode.ts` |
| 108 | LemurTaskNode | `lemurTask` | `backend/nodes/plugins/LemurTaskNode.ts` | `packages/core/src/plugins/assemblyAi/LemurTaskNode.ts` |
| 109 | AutoEvalsNode | `autoEvals` | `backend/nodes/plugins/AutoEvalsNode.ts` | `packages/core/src/plugins/autoevals/AutoEvalsNode.ts` |
