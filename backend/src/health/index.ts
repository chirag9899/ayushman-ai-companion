import { APIGatewayProxyResultV2 } from 'aws-lambda'
import { json } from '../lib/response'

export const handler = async (): Promise<APIGatewayProxyResultV2> => {
  return json(200, {
    service: 'ayushman-ai-companion-backend',
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
