import { getTenantId } from "#server/utils/tenant"
import { useChatStore } from "#server/utils/chat-store"

export default defineEventHandler(async event => {
  const sessionId = getRouterParam(event, "id")
  const userId = getQuery(event).userId

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "sessionId route parameter is required",
    })
  }

  if (typeof userId !== "string" || !userId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId query parameter is required",
    })
  }

  const tenantId = getTenantId()
  const store = useChatStore()
  const session = store.getSession({
    tenantId,
    sessionId,
    userId: userId.trim(),
  })

  if (!session) {
    throw createError({
      statusCode: 404,
      statusMessage: "Session not found",
    })
  }

  return {
    tenantId,
    session,
    sessionFiles: store.listSessionFiles({
      tenantId,
      sessionId,
      userId: userId.trim(),
    }),
    messages: store.listMessages({
      tenantId,
      sessionId,
      userId: userId.trim(),
    }),
  }
})
