# Merged Built-In Nodes Catalog

This document lists all **109 built-in nodes** merged from Ironclad Rivet (`github.com/Ironclad/rivet` - MIT License) without modification or exclusions.

## Summary by Category

| Category | Node Count | Description |
|---|---|---|
| **Graph & Flow Control** | 13 | Subgraphs, conditional branching, loops, races, and flow termination |
| **Chat & Language Models** | 9 | Chat execution, prompt assembly, message trimming, and loops |
| **Data Manipulation** | 26 | JSON, YAML, Regex, Objects, Arrays, math, booleans, and tables |
| **Files, Datasets & Vectors** | 13 | File I/O, vector stores, nearest neighbors, and dataset rows |
| **OpenAI Assistants** | 15 | Complete OpenAI Assistants API (threads, messages, runs, files) |
| **MCP (Model Context Protocol)** | 3 | Tool discovery, prompt retrieval, and tool execution |
| **Media & Audio** | 3 | Audio playback, audio loading, and image handling |
| **Utility & System** | 17 | Code execution, context, globals, events, HTTP, cron, delay |
| **Integrated Plugins** | 10 | Anthropic, Google, Hugging Face, AssemblyAI, and AutoEvals |
| **Total** | **109** | **Full Rivet built-in node inventory** |

---

## Complete Node Directory & Source Mapping

### 1. Graph & Flow Control
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| SubGraphNode | `subGraph` | `packages/core/src/model/nodes/SubGraphNode.ts` |
| GraphInputNode | `graphInput` | `packages/core/src/model/nodes/GraphInputNode.ts` |
| GraphOutputNode | `graphOutput` | `packages/core/src/model/nodes/GraphOutputNode.ts` |
| CallGraphNode | `callGraph` | `packages/core/src/model/nodes/CallGraphNode.ts` |
| ListGraphsNode | `listGraphs` | `packages/core/src/model/nodes/ListGraphsNode.ts` |
| GraphReferenceNode | `graphReference` | `packages/core/src/model/nodes/GraphReferenceNode.ts` |
| ReferencedGraphAliasNode | `referencedGraphAlias` | `packages/core/src/model/nodes/ReferencedGraphAliasNode.ts` |
| IfNode | `if` | `packages/core/src/model/nodes/IfNode.ts` |
| IfElseNode | `ifElse` | `packages/core/src/model/nodes/IfElseNode.ts` |
| MatchNode | `match` | `packages/core/src/model/nodes/MatchNode.ts` |
| LoopControllerNode | `loopController` | `packages/core/src/model/nodes/LoopControllerNode.ts` |
| LoopUntilNode | `loopUntil` | `packages/core/src/model/nodes/LoopUntilNode.ts` |
| AbortGraphNode | `abortGraph` | `packages/core/src/model/nodes/AbortGraphNode.ts` |
| RaceInputsNode | `raceInputs` | `packages/core/src/model/nodes/RaceInputsNode.ts` |

### 2. Chat & Models
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| ChatNode | `chat` | `packages/core/src/model/nodes/ChatNode.ts` |
| ChatNodeBase | `chatBase` | `packages/core/src/model/nodes/ChatNodeBase.ts` |
| ChatLoopNode | `chatLoop` | `packages/core/src/model/nodes/ChatLoopNode.ts` |
| PromptNode | `prompt` | `packages/core/src/model/nodes/PromptNode.ts` |
| AssemblePromptNode | `assemblePrompt` | `packages/core/src/model/nodes/AssemblePromptNode.ts` |
| AssembleMessageNode | `assembleMessage` | `packages/core/src/model/nodes/AssembleMessageNode.ts` |
| TrimChatMessagesNode | `trimChatMessages` | `packages/core/src/model/nodes/TrimChatMessagesNode.ts` |
| ToolNode (gptFunction) | `gptFunction` | `packages/core/src/model/nodes/ToolNode.ts` |
| DelegateFunctionCallNode | `delegateFunctionCall` | `packages/core/src/model/nodes/DelegateFunctionCallNode.ts` |

### 3. Data Manipulation
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| ArrayNode | `array` | `packages/core/src/model/nodes/ArrayNode.ts` |
| ObjectNode | `object` | `packages/core/src/model/nodes/ObjectNode.ts` |
| DestructureNode | `destructure` | `packages/core/src/model/nodes/DestructureNode.ts` |
| ExtractJsonNode | `extractJson` | `packages/core/src/model/nodes/ExtractJsonNode.ts` |
| ExtractYamlNode | `extractYaml` | `packages/core/src/model/nodes/ExtractYamlNode.ts` |
| ExtractRegexNode | `extractRegex` | `packages/core/src/model/nodes/ExtractRegexNode.ts` |
| ExtractObjectPathNode | `extractObjectPath` | `packages/core/src/model/nodes/ExtractObjectPathNode.ts` |
| ExtractMarkdownCodeBlocksNode | `extractMarkdownCodeBlocks` | `packages/core/src/model/nodes/ExtractMarkdownCodeBlocksNode.ts` |
| ChunkNode | `chunk` | `packages/core/src/model/nodes/ChunkNode.ts` |
| SliceNode | `slice` | `packages/core/src/model/nodes/SliceNode.ts` |
| SplitNode | `split` | `packages/core/src/model/nodes/SplitNode.ts` |
| JoinNode | `join` | `packages/core/src/model/nodes/JoinNode.ts` |
| FilterNode | `filter` | `packages/core/src/model/nodes/FilterNode.ts` |
| CoalesceNode | `coalesce` | `packages/core/src/model/nodes/CoalesceNode.ts` |
| BooleanNode | `boolean` | `packages/core/src/model/nodes/BooleanNode.ts` |
| CompareNode | `compare` | `packages/core/src/model/nodes/CompareNode.ts` |
| EvaluateNode | `evaluate` | `packages/core/src/model/nodes/EvaluateNode.ts` |
| NumberNode | `number` | `packages/core/src/model/nodes/NumberNode.ts` |
| RandomNumberNode | `randomNumber` | `packages/core/src/model/nodes/RandomNumberNode.ts` |
| ShuffleNode | `shuffle` | `packages/core/src/model/nodes/ShuffleNode.ts` |
| HashNode | `hash` | `packages/core/src/model/nodes/HashNode.ts` |
| ToJsonNode | `toJson` | `packages/core/src/model/nodes/ToJsonNode.ts` |
| ToYamlNode | `toYaml` | `packages/core/src/model/nodes/ToYamlNode.ts` |
| ToMarkdownTableNode | `toMarkdownTable` | `packages/core/src/model/nodes/ToMarkdownTableNode.ts` |
| ToTreeNode | `toTree` | `packages/core/src/model/nodes/ToTreeNode.ts` |
| PopNode | `pop` | `packages/core/src/model/nodes/PopNode.ts` |

### 4. Files, Datasets & Vectors
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| ReadFileNode | `readFile` | `packages/core/src/model/nodes/ReadFileNode.ts` |
| ReadDirectoryNode | `readDirectory` | `packages/core/src/model/nodes/ReadDirectoryNode.ts` |
| ReadAllFilesNode | `readAllFiles` | `packages/core/src/model/nodes/ReadAllFilesNode.ts` |
| CreateDatasetNode | `createDataset` | `packages/core/src/model/nodes/CreateDatasetNode.ts` |
| LoadDatasetNode | `loadDataset` | `packages/core/src/model/nodes/LoadDatasetNode.ts` |
| AppendToDatasetNode | `appendToDataset` | `packages/core/src/model/nodes/AppendToDatasetNode.ts` |
| GetAllDatasetsNode | `getAllDatasets` | `packages/core/src/model/nodes/GetAllDatasetsNode.ts` |
| GetDatasetRowNode | `getDatasetRow` | `packages/core/src/model/nodes/GetDatasetRowNode.ts` |
| ReplaceDatasetNode | `replaceDataset` | `packages/core/src/model/nodes/ReplaceDatasetNode.ts` |
| DatasetNearestNeighborsNode | `datasetNearestNeighbors` | `packages/core/src/model/nodes/DatasetNearestNeigborsNode.ts` |
| VectorStoreNode | `vectorStore` | `packages/core/src/model/nodes/VectorStoreNode.ts` |
| VectorNearestNeighborsNode | `vectorNearestNeighbors` | `packages/core/src/model/nodes/VectorNearestNeighborsNode.ts` |
| GetEmbeddingNode | `getEmbedding` | `packages/core/src/model/nodes/GetEmbeddingNode.ts` |

### 5. OpenAI Assistants Nodes
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| CreateAssistantNode | `createAssistant` | `packages/core/src/plugins/openai/nodes/CreateAssistantNode.ts` |
| GetAssistantNode | `getAssistant` | `packages/core/src/plugins/openai/nodes/GetAssistantNode.ts` |
| ListAssistantsNode | `listAssistants` | `packages/core/src/plugins/openai/nodes/ListAssistantsNode.ts` |
| DeleteAssistantNode | `deleteAssistant` | `packages/core/src/plugins/openai/nodes/DeleteAssistantNode.ts` |
| AttachAssistantFileNode | `attachAssistantFile` | `packages/core/src/plugins/openai/nodes/AttachAssistantFileNode.ts` |
| CreateThreadNode | `createThread` | `packages/core/src/plugins/openai/nodes/CreateThreadNode.ts` |
| GetThreadNode | `getThread` | `packages/core/src/plugins/openai/nodes/GetThreadNode.ts` |
| DeleteThreadNode | `deleteThread` | `packages/core/src/plugins/openai/nodes/DeleteThreadNode.ts` |
| CreateThreadMessageNode | `createThreadMessage` | `packages/core/src/plugins/openai/nodes/CreateThreadMessageNode.ts` |
| ThreadMessageNode | `threadMessage` | `packages/core/src/plugins/openai/nodes/ThreadMessageNode.ts` |
| ListThreadMessagesNode | `listThreadMessages` | `packages/core/src/plugins/openai/nodes/ListThreadMessagesNode.ts` |
| RunThreadNode | `runThread` | `packages/core/src/plugins/openai/nodes/RunThreadNode.ts` |
| UploadFileNode | `uploadFile` | `packages/core/src/plugins/openai/nodes/UploadFileNode.ts` |
| GetOpenAIFileNode | `getOpenAIFile` | `packages/core/src/plugins/openai/nodes/GetOpenAIFileNode.ts` |
| ListOpenAIFilesNode | `listOpenAIFiles` | `packages/core/src/plugins/openai/nodes/ListOpenAIFilesNode.ts` |

### 6. Model Context Protocol (MCP)
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| MCPDiscoveryNode | `mcpDiscovery` | `packages/core/src/model/nodes/MCPDiscoveryNode.ts` |
| MCPGetPromptNode | `mcpGetPrompt` | `packages/core/src/model/nodes/MCPGetPromptNode.ts` |
| MCPToolCallNode | `mcpToolCall` | `packages/core/src/model/nodes/MCPToolCallNode.ts` |

### 7. Media & Audio
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| ImageNode | `image` | `packages/core/src/model/nodes/ImageNode.ts` |
| AudioNode | `audio` | `packages/core/src/model/nodes/AudioNode.ts` |
| PlayAudioNode | `playAudio` | `packages/core/src/model/nodes/PlayAudioNode.ts` |

### 8. Utility & System
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| CodeNode | `code` | `packages/core/src/model/nodes/CodeNode.ts` |
| CommentNode | `comment` | `packages/core/src/model/nodes/CommentNode.ts` |
| ContextNode | `context` | `packages/core/src/model/nodes/ContextNode.ts` |
| CronNode | `cron` | `packages/core/src/model/nodes/CronNode.ts` |
| DelayNode | `delay` | `packages/core/src/model/nodes/DelayNode.ts` |
| DocumentNode | `document` | `packages/core/src/model/nodes/DocumentNode.ts` |
| ExternalCallNode | `externalCall` | `packages/core/src/model/nodes/ExternalCallNode.ts` |
| GetGlobalNode | `getGlobal` | `packages/core/src/model/nodes/GetGlobalNode.ts` |
| SetGlobalNode | `setGlobal` | `packages/core/src/model/nodes/SetGlobalNode.ts` |
| HttpCallNode | `httpCall` | `packages/core/src/model/nodes/HttpCallNode.ts` |
| PassthroughNode | `passthrough` | `packages/core/src/model/nodes/PassthroughNode.ts` |
| RaiseEventNode | `raiseEvent` | `packages/core/src/model/nodes/RaiseEventNode.ts` |
| TextNode | `text` | `packages/core/src/model/nodes/TextNode.ts` |
| URLReferenceNode | `urlReference` | `packages/core/src/model/nodes/URLReferenceNode.ts` |
| UserInputNode | `userInput` | `packages/core/src/model/nodes/UserInputNode.ts` |
| WaitForEventNode | `waitForEvent` | `packages/core/src/model/nodes/WaitForEventNode.ts` |

### 9. Core Integrated Plugin Nodes
| Node Name | Type Identifier | Sourced From Rivet |
|---|---|---|
| ChatAnthropicNode | `chatAnthropic` | `packages/core/src/plugins/anthropic/nodes/ChatAnthropicNode.ts` |
| ChatGoogleNode | `chatGoogle` | `packages/core/src/plugins/google/nodes/ChatGoogleNode.ts` |
| ChatHuggingFace | `chatHuggingFace` | `packages/core/src/plugins/huggingface/nodes/ChatHuggingFace.ts` |
| TextToImageHuggingFace | `textToImageHuggingFace` | `packages/core/src/plugins/huggingface/nodes/TextToImageHuggingFace.ts` |
| TranscribeAudioNode | `transcribeAudio` | `packages/core/src/plugins/assemblyAi/TranscribeAudioNode.ts` |
| LemurSummaryNode | `lemurSummary` | `packages/core/src/plugins/assemblyAi/LemurSummaryNode.ts` |
| LemurQaNode | `lemurQa` | `packages/core/src/plugins/assemblyAi/LemurQaNode.ts` |
| LemurActionItemsNode | `lemurActionItems` | `packages/core/src/plugins/assemblyAi/LemurActionItemsNode.ts` |
| LemurTaskNode | `lemurTask` | `packages/core/src/plugins/assemblyAi/LemurTaskNode.ts` |
| AutoEvalsNode | `autoEvals` | `packages/core/src/plugins/autoevals/AutoEvalsNode.ts` |
