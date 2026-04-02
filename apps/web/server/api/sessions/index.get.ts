import { getTenantId } from "../../utils/tenant"
import { useChatStore } from "../../utils/chat-store"

export default defineEventHandler(async event => {
  const userId = getQuery(event).userId

  if (typeof userId !== "string" || !userId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId query parameter is required",
    })
  }

  const tenantId = getTenantId()
  const store = useChatStore()

  return {
    tenantId,
    sessions: store.listSessions(tenantId, userId.trim()),
  }
})
