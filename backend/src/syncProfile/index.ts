import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { ddbDocClient } from '../lib/aws'
import { json } from '../lib/response'

type ProfileSyncRequest = {
  id?: string
  consentAccepted?: boolean
  [key: string]: unknown
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const payload: ProfileSyncRequest = event?.body ? JSON.parse(event.body) : {}
    const profileId = payload.id
    const consentAccepted = payload.consentAccepted

    if (!profileId) {
      return json(400, { message: 'Profile id is required.' })
    }

    if (!consentAccepted) {
      return json(403, {
        message: 'Cloud sync denied: user consent is required.',
      })
    }

    const usersTable = process.env.USERS_TABLE
    if (!usersTable) {
      throw new Error('USERS_TABLE environment variable is missing.')
    }

    await ddbDocClient.send(
      new PutCommand({
        TableName: usersTable,
        Item: {
          pk: `user#${profileId}`,
          profile: payload,
          updatedAt: new Date().toISOString(),
        },
      })
    )

    return json(200, {
      message: 'Profile synced to DynamoDB.',
      syncedProfileId: profileId,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    return json(400, {
      message: 'Invalid request body.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
