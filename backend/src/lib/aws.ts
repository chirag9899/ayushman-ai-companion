import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'

const region = process.env.AWS_REGION || 'ap-south-1'
const bedrockRegion = process.env.BEDROCK_REGION || region

const ddbClient = new DynamoDBClient({ region })

export const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export const bedrockClient = new BedrockRuntimeClient({ region: bedrockRegion })
export const s3Client = new S3Client({ region })
