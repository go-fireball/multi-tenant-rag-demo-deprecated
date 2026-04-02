import { generateAssistantReply } from "../utils/chat-assistant"
import { useChatStore } from "../utils/chat-store"
import { getTenantId } from "../utils/tenant"

interface ChatRequestBody {
  sessionId?: string
  userId?: string
  message?: string
  fileIds?: string[]
}

function writeSseChunk(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export default defineEventHandler(async event => {
  const body = await readBody<ChatRequestBody>(event)
  const userId = body?.userId?.trim()
  const message = body?.message?.trim()
  const hasExplicitFileIds = Array.isArray(body?.fileIds)
  const fileIds = hasExplicitFileIds
    ? body.fileIds.filter((fileId): fileId is string => typeof fileId === "string" && fileId.trim().length > 0)
    : []

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId is required",
    })
  }

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: "message is required",
    })
  }

  const tenantId = getTenantId()
  const store = useChatStore()
  let session = body.sessionId
    ? store.getSession({
      tenantId,
      sessionId: body.sessionId,
      userId,
    })
    : null

  if (!session) {
    session = store.createSession({
      tenantId,
      userId,
      title: message,
    })
  }

  const attachedFiles = fileIds.length > 0
    ? store.getSessionFiles({
      tenantId,
      sessionId: session.id,
      userId,
      fileIds,
    })
    : []

  if (hasExplicitFileIds && fileIds.length > 0 && attachedFiles.length !== fileIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "One or more fileIds are invalid for this tenant, user, or session",
    })
  }

  const userMessage = store.appendMessage({
    tenantId,
    sessionId: session.id,
    userId,
    role: "user",
    content: message,
    attachedFiles,
  })

  const history = store.listMessages({
    tenantId,
    sessionId: session.id,
    userId,
  })

  const assistantReply = generateAssistantReply({
    tenantId,
    userMessage: message,
    history,
  })

  const encoder = new TextEncoder()
  const tokens = assistantReply.content.split(" ")

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(writeSseChunk({
        type: "session",
        session,
      })))

      controller.enqueue(encoder.encode(writeSseChunk({
        type: "message_saved",
        message: userMessage,
      })))

      controller.enqueue(encoder.encode(writeSseChunk({
        type: "assistant_start",
      })))

      let accumulated = ""

      for (const token of tokens) {
        const chunk = accumulated ? ` ${token}` : token
        accumulated += chunk

        controller.enqueue(encoder.encode(writeSseChunk({
          type: "assistant_delta",
          delta: chunk,
        })))

        await new Promise(resolve => setTimeout(resolve, 20))
      }

      const assistantMessage = store.appendMessage({
        tenantId,
        sessionId: session.id,
        userId,
        role: "assistant",
        content: accumulated,
        citations: assistantReply.citations,
      })

      controller.enqueue(encoder.encode(writeSseChunk({
        type: "assistant_done",
        message: assistantMessage,
      })))

      controller.enqueue(encoder.encode(writeSseChunk({
        type: "done",
        sessionId: session.id,
      })))

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  })
})
