# RA1

Canvas-based agentic workspace.

## Services
| Service | URL | Purpose |
|---|---|---|
| Canvas | http://localhost:5173 | RA1 node canvas builder |
| API | http://localhost:3001 | RA1 backend |
| LibreChat | http://localhost:3080 | Chat interface |
| LiteLLM | http://localhost:4000 | Model proxy |
| Langfuse | http://localhost:3002 | Observability |

## Setup
1. Copy `.env.example` to `.env`
2. Fill in your API keys (`OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`)
3. Run: `docker-compose up --build`

## First run
- Open LibreChat at http://localhost:3080
- Register an account
- Select RA1 as endpoint
- Start chatting
