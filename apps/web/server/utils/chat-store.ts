type ChatRole = "user" | "assistant"
type SessionFileStatus = "ready"

export interface ChatSessionRecord {
  id: string
  tenant_id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatCitationRecord {
  id: string
  label: string
  uri: string
}

export interface ChatMessageRecord {
  id: string
  tenant_id: string
  session_id: string
  user_id: string
  role: ChatRole
  content: string
  citations: ChatCitationRecord[]
  attached_files: ChatSessionFileRecord[]
  created_at: string
}

export interface ChatSessionFileRecord {
  file_id: string
  tenant_id: string
  user_id: string
  session_id: string
  original_name: string
  sanitized_name: string
  content_type: string
  size_bytes: number
  storage_bucket: string
  storage_key: string
  status: SessionFileStatus
  created_at: string
  updated_at: string
}

interface SessionCreateInput {
  tenantId: string
  userId: string
  title?: string
}

interface MessageAppendInput {
  tenantId: string
  sessionId: string
  userId: string
  role: ChatRole
  content: string
  citations?: ChatCitationRecord[]
  attachedFiles?: ChatSessionFileRecord[]
}

interface SessionFilesCreateInput {
  tenantId: string
  sessionId: string
  userId: string
  files: Array<Omit<ChatSessionFileRecord, "tenant_id" | "session_id" | "user_id" | "created_at" | "updated_at">>
}

interface SessionFilesLookupInput extends SessionLookupInput {
  fileIds?: string[]
}

interface SessionLookupInput {
  tenantId: string
  sessionId: string
  userId: string
}

interface ChatPersistence {
  createSession(input: SessionCreateInput): ChatSessionRecord
  listSessions(tenantId: string, userId: string): ChatSessionRecord[]
  getSession(input: SessionLookupInput): ChatSessionRecord | null
  listMessages(input: SessionLookupInput): ChatMessageRecord[]
  appendMessage(input: MessageAppendInput): ChatMessageRecord
  createSessionFiles(input: SessionFilesCreateInput): ChatSessionFileRecord[]
  listSessionFiles(input: SessionLookupInput): ChatSessionFileRecord[]
  getSessionFiles(input: SessionFilesLookupInput): ChatSessionFileRecord[]
}

class InMemoryChatPersistence implements ChatPersistence {
  private sessions = new Map<string, ChatSessionRecord>()
  private sessionOrder = new Map<string, string[]>()
  private messages = new Map<string, ChatMessageRecord[]>()
  private sessionFiles = new Map<string, ChatSessionFileRecord[]>()

  createSession(input: SessionCreateInput) {
    const now = new Date().toISOString()
    const session: ChatSessionRecord = {
      id: crypto.randomUUID(),
      tenant_id: input.tenantId,
      user_id: input.userId,
      title: input.title?.trim() || "New chat",
      created_at: now,
      updated_at: now,
    }

    this.sessions.set(session.id, session)
    this.messages.set(session.id, [])
    this.sessionFiles.set(session.id, [])

    const scopeKey = this.scopeKey(input.tenantId, input.userId)
    const scopedSessions = this.sessionOrder.get(scopeKey) ?? []
    this.sessionOrder.set(scopeKey, [session.id, ...scopedSessions])

    return session
  }

  listSessions(tenantId: string, userId: string) {
    const scopeKey = this.scopeKey(tenantId, userId)
    const sessionIds = this.sessionOrder.get(scopeKey) ?? []

    return sessionIds
      .map(sessionId => this.sessions.get(sessionId))
      .filter((session): session is ChatSessionRecord => Boolean(session))
  }

  getSession(input: SessionLookupInput) {
    const session = this.sessions.get(input.sessionId)

    if (!session) {
      return null
    }

    if (session.tenant_id !== input.tenantId || session.user_id !== input.userId) {
      return null
    }

    return session
  }

  listMessages(input: SessionLookupInput) {
    if (!this.getSession(input)) {
      return []
    }

    return [...(this.messages.get(input.sessionId) ?? [])]
  }

  appendMessage(input: MessageAppendInput) {
    const session = this.getSession({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      userId: input.userId,
    })

    if (!session) {
      throw createError({
        statusCode: 404,
        statusMessage: "Session not found for tenant and user scope",
      })
    }

    const now = new Date().toISOString()
    const message: ChatMessageRecord = {
      id: crypto.randomUUID(),
      tenant_id: input.tenantId,
      session_id: input.sessionId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
      citations: input.citations ?? [],
      attached_files: input.attachedFiles ?? [],
      created_at: now,
    }

    const messages = this.messages.get(input.sessionId) ?? []
    this.messages.set(input.sessionId, [...messages, message])

    const updatedSession = {
      ...session,
      title: this.deriveTitle(session.title, input.role, input.content),
      updated_at: now,
    }

    this.sessions.set(input.sessionId, updatedSession)
    this.bumpSessionOrder(updatedSession)

    return message
  }

  createSessionFiles(input: SessionFilesCreateInput) {
    const session = this.getSession(input)

    if (!session) {
      throw createError({
        statusCode: 404,
        statusMessage: "Session not found for tenant and user scope",
      })
    }

    const now = new Date().toISOString()
    const existingFiles = this.sessionFiles.get(input.sessionId) ?? []
    const createdFiles = input.files.map(file => {
      const record: ChatSessionFileRecord = {
        ...file,
        tenant_id: input.tenantId,
        session_id: input.sessionId,
        user_id: input.userId,
        created_at: now,
        updated_at: now,
      }

      return record
    })

    this.sessionFiles.set(input.sessionId, [...existingFiles, ...createdFiles])

    const updatedSession = {
      ...session,
      updated_at: now,
    }

    this.sessions.set(input.sessionId, updatedSession)
    this.bumpSessionOrder(updatedSession)

    return createdFiles
  }

  listSessionFiles(input: SessionLookupInput) {
    if (!this.getSession(input)) {
      return []
    }

    return [...(this.sessionFiles.get(input.sessionId) ?? [])]
  }

  getSessionFiles(input: SessionFilesLookupInput) {
    const scopedFiles = this.listSessionFiles(input)

    if (!input.fileIds?.length) {
      return scopedFiles
    }

    const fileIds = new Set(input.fileIds)
    return scopedFiles.filter(file => fileIds.has(file.file_id))
  }

  private deriveTitle(currentTitle: string, role: ChatRole, content: string) {
    if (currentTitle !== "New chat" || role !== "user") {
      return currentTitle
    }

    const trimmed = content.trim()

    if (!trimmed) {
      return currentTitle
    }

    return trimmed.slice(0, 60)
  }

  private bumpSessionOrder(session: ChatSessionRecord) {
    const scopeKey = this.scopeKey(session.tenant_id, session.user_id)
    const sessionIds = this.sessionOrder.get(scopeKey) ?? []
    const nextIds = [session.id, ...sessionIds.filter(id => id !== session.id)]
    this.sessionOrder.set(scopeKey, nextIds)
  }

  private scopeKey(tenantId: string, userId: string) {
    return `${tenantId}:${userId}`
  }
}

declare global {
  var __chatPersistence__: ChatPersistence | undefined
}

export function useChatStore() {
  if (!globalThis.__chatPersistence__) {
    globalThis.__chatPersistence__ = new InMemoryChatPersistence()
  }

  return globalThis.__chatPersistence__
}
