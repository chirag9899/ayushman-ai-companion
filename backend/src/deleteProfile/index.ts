import {
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  type NativeAttributeValue,
} from '@aws-sdk/lib-dynamodb'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { ddbDocClient } from '../lib/aws'
import { json } from '../lib/response'

type DeleteProfileRequest = {
  id?: string
  consentAccepted?: boolean
  [key: string]: unknown
}

async function deleteUserRecord(profileId: string) {
  const usersTable = process.env.USERS_TABLE
  if (!usersTable) throw new Error('USERS_TABLE environment variable is missing.')

  await ddbDocClient.send(
    new DeleteCommand({
      TableName: usersTable,
      Key: { pk: `user#${profileId}` },
    })
  )
}

async function deleteAllByPk(tableName: string | undefined, profileId: string) {
  if (!tableName) return

  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `user#${profileId}`,
      },
    })
  )

  const items = (result.Items || []) as Array<{ pk: NativeAttributeValue; sk?: NativeAttributeValue }>
  for (const item of items) {
    if (!item.pk || !item.sk) continue
    await ddbDocClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk: item.pk, sk: item.sk },
      })
    )
  }
}

async function deleteTipCacheEntries(profileId: string) {
  const tipsTable = process.env.TIPS_TABLE
  if (!tipsTable) return

  let lastEvaluatedKey: Record<string, NativeAttributeValue> | undefined
  do {
    const result = await ddbDocClient.send(
      new ScanCommand({
        TableName: tipsTable,
        ProjectionExpression: 'pk, sk',
        FilterExpression: 'begins_with(pk, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': `tip#${profileId}:`,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    )

    const items = (result.Items || []) as Array<{ pk?: NativeAttributeValue; sk?: NativeAttributeValue }>
    for (const item of items) {
      if (!item.pk || !item.sk) continue
      await ddbDocClient.send(
        new DeleteCommand({
          TableName: tipsTable,
          Key: { pk: item.pk, sk: item.sk },
        })
      )
    }

    lastEvaluatedKey = result.LastEvaluatedKey as Record<string, NativeAttributeValue> | undefined
  } while (lastEvaluatedKey)
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const payload: DeleteProfileRequest = event?.body ? JSON.parse(event.body) : {}
    const profileId = payload.id
    const consentAccepted = payload.consentAccepted

    if (!profileId) {
      return json(400, { message: 'Profile id is required.' })
    }

    if (!consentAccepted) {
      return json(403, {
        message: 'Cloud delete denied: user consent is required.',
      })
    }

    await deleteUserRecord(profileId)
    await Promise.all([
      deleteAllByPk(process.env.SYMPTOMS_TABLE, profileId),
      deleteAllByPk(process.env.MEDICATIONS_TABLE, profileId),
      deleteAllByPk(process.env.REMINDERS_TABLE, profileId),
      deleteTipCacheEntries(profileId),
    ])

    return json(200, {
      message: 'Profile data deleted from cloud tables.',
      deletedProfileId: profileId,
      deletedAt: new Date().toISOString(),
    })
  } catch (error) {
    return json(400, {
      message: 'Invalid request body.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
