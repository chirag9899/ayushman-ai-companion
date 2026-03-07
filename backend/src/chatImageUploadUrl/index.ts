import { PutObjectCommand } from '@aws-sdk/client-s3'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client } from '../lib/aws'
import { json } from '../lib/response'

type UploadUrlRequest = {
  mediaType?: string
  profileId?: string
}

function safeMediaType(mediaType?: string) {
  if (mediaType === 'image/png') return 'image/png'
  return 'image/jpeg'
}

function extensionFromMediaType(mediaType: string) {
  return mediaType === 'image/png' ? 'png' : 'jpg'
}

function compactId(value?: string) {
  return (value || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'anon'
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const payload: UploadUrlRequest = event?.body ? JSON.parse(event.body) : {}
    const uploadsBucket = process.env.CHAT_UPLOADS_BUCKET
    if (!uploadsBucket) {
      return json(500, { message: 'Missing CHAT_UPLOADS_BUCKET environment variable.' })
    }

    const mediaType = safeMediaType(payload.mediaType)
    const profileId = compactId(payload.profileId)
    const ext = extensionFromMediaType(mediaType)
    const imageKey = `chat-uploads/${profileId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

    const putCommand = new PutObjectCommand({
      Bucket: uploadsBucket,
      Key: imageKey,
      ContentType: mediaType,
      ServerSideEncryption: 'AES256',
    })
    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 60 * 5 })

    return json(200, {
      uploadUrl,
      imageKey,
      expiresInSeconds: 60 * 5,
      requiredHeaders: {
        'Content-Type': mediaType,
      },
    })
  } catch (error) {
    return json(400, {
      message: 'Invalid request body.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
