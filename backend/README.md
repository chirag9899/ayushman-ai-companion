# Backend Scaffold

This folder contains an AWS SAM scaffold for:

- HTTP API Gateway
- Lambda functions (`/health`, `/tips/generate`, `/profile/sync`, `/profile/delete`)
- DynamoDB tables (`users`, `symptoms`, `medications`, `reminders`, `tips`)
- S3 bucket for frontend build artifacts
- TypeScript backend source compiled by SAM `esbuild`

## Deploy

1. Install AWS SAM CLI.
2. Install dependencies:

```bash
npm install
```

3. From this folder run:

```bash
sam build
sam deploy --guided
```

## Test locally

```bash
sam local start-api
```

Then call:

- `GET /health`
- `POST /tips/generate`
- `POST /profile/sync`
- `POST /profile/delete`

## Environment variables

- `BEDROCK_MODEL_ID` (default `anthropic.claude-3-haiku-20240307-v1:0`)
- `USERS_TABLE`
- `TIPS_TABLE`

## Type checking

```bash
npm run check
```
