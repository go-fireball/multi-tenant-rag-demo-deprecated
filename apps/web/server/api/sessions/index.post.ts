import { getTenantId } from "../../utils/tenant"
import { useChatStore } from "../../utils/chat-store"

export default defineEventHandler(async event => {
  const body = await readBody<{ title?: string, userId?: string }>(event)

  if (typeof body?.userId !== "string" || !body.userId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId is required",
    })
  }

  const tenantId = getTenantId()
  const store = useChatStore()
  const session = store.createSession({
    tenantId,
    userId: body.userId.trim(),
    title: body.title,
  })

  return {
    tenantId,
    session,
  }
})
