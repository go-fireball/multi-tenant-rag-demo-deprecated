<script setup lang="ts">
interface CitationRecord {
  id: string
  label: string
  uri: string
}

interface MessageRecord {
  id: string
  tenant_id: string
  session_id: string
  user_id: string
  role: "user" | "assistant"
  content: string
  citations: CitationRecord[]
  attached_files: SessionFileRecord[]
  created_at: string
}

interface SessionFileRecord {
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
  status: "ready"
  created_at: string
  updated_at: string
}

interface SessionRecord {
  id: string
  tenant_id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

interface SessionsResponse {
  tenantId: string
  sessions: SessionRecord[]
}

interface MessagesResponse {
  tenantId: string
  session: SessionRecord
  sessionFiles: SessionFileRecord[]
  messages: MessageRecord[]
}

interface SessionCreateResponse {
  tenantId: string
  session: SessionRecord
}

interface HealthResponse {
  tenantId: string
}

interface UploadFilesResponse {
  tenantId: string
  sessionId: string
  files: SessionFileRecord[]
}

const config = useRuntimeConfig()
const { data: health } = await useFetch<HealthResponse>("/api/health")
const tenantId = ref(health.value?.tenantId ?? config.public.tenantId ?? "local-dev")
const draft = ref("")
const userId = ref("")
const sessions = ref<SessionRecord[]>([])
const currentSessionId = ref<string | null>(null)
const messages = ref<MessageRecord[]>([])
const sessionFiles = ref<SessionFileRecord[]>([])
const selectedFileIds = ref<string[]>([])
const pendingAssistantText = ref("")
const isLoading = ref(false)
const isUploading = ref(false)
const errorMessage = ref("")

function syncTenantId(nextTenantId?: string) {
  if (!nextTenantId) {
    return
  }

  tenantId.value = nextTenantId
}

const orderedMessages = computed(() => {
  if (!pendingAssistantText.value) {
    return messages.value
  }

  return [
    ...messages.value,
    {
      id: "pending-assistant",
      tenant_id: tenantId.value,
      session_id: currentSessionId.value ?? "pending",
      user_id: userId.value,
      role: "assistant" as const,
      content: pendingAssistantText.value,
      citations: [],
      attached_files: [],
      created_at: new Date().toISOString(),
    },
  ]
})

function getStoredUserId() {
  const storageKey = "multi-tenant-rag-demo:user-id"
  const existingId = localStorage.getItem(storageKey)

  if (existingId) {
    return existingId
  }

  const nextId = crypto.randomUUID()
  localStorage.setItem(storageKey, nextId)
  return nextId
}

function setStoredSessionId(sessionId: string | null) {
  const storageKey = `multi-tenant-rag-demo:${tenantId.value}:session-id`

  if (sessionId) {
    localStorage.setItem(storageKey, sessionId)
    return
  }

  localStorage.removeItem(storageKey)
}

function getStoredSessionId() {
  const storageKey = `multi-tenant-rag-demo:${tenantId.value}:session-id`
  return localStorage.getItem(storageKey)
}

async function loadSessions() {
  if (!userId.value) {
    return
  }

  const response = await $fetch<SessionsResponse>("/api/sessions", {
    query: { userId: userId.value },
  })

  syncTenantId(response.tenantId)
  sessions.value = response.sessions
}

async function loadMessages(sessionId: string) {
  const response = await $fetch<MessagesResponse>(`/api/sessions/${sessionId}/messages`, {
    query: { userId: userId.value },
  })

  syncTenantId(response.tenantId)
  currentSessionId.value = response.session.id
  sessionFiles.value = response.sessionFiles
  messages.value = response.messages
  selectedFileIds.value = []
  pendingAssistantText.value = ""
  setStoredSessionId(response.session.id)
}

async function createSession() {
  const response = await $fetch<SessionCreateResponse>("/api/sessions", {
    method: "POST",
    body: {
      userId: userId.value,
      title: "New chat",
    },
  })

  syncTenantId(response.tenantId)
  sessions.value = [response.session, ...sessions.value.filter(session => session.id !== response.session.id)]
  await loadMessages(response.session.id)
  return response.session
}

async function selectSession(sessionId: string) {
  errorMessage.value = ""
  await loadMessages(sessionId)
}

function applySessionsUpsert(session: SessionRecord) {
  sessions.value = [session, ...sessions.value.filter(entry => entry.id !== session.id)]
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function isFileSelected(fileId: string) {
  return selectedFileIds.value.includes(fileId)
}

function toggleFileSelection(fileId: string) {
  selectedFileIds.value = isFileSelected(fileId)
    ? selectedFileIds.value.filter(id => id !== fileId)
    : [...selectedFileIds.value, fileId]
}

async function uploadSelectedFiles(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = input?.files ? Array.from(input.files) : []

  if (!files.length || !userId.value || isUploading.value) {
    return
  }

  errorMessage.value = ""
  isUploading.value = true

  try {
    let sessionId = currentSessionId.value

    if (!sessionId) {
      const session = await createSession()
      sessionId = session.id
    }

    const formData = new FormData()
    formData.append("userId", userId.value)
    formData.append("sessionId", sessionId)

    for (const file of files) {
      formData.append("files", file)
    }

    const response = await $fetch<UploadFilesResponse>("/api/files", {
      method: "POST",
      body: formData,
    })

    syncTenantId(response.tenantId)
    currentSessionId.value = response.sessionId
    sessionFiles.value = [...sessionFiles.value, ...response.files]
    selectedFileIds.value = response.files.map(file => file.file_id)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to upload files"
  }
  finally {
    isUploading.value = false

    if (input) {
      input.value = ""
    }
  }
}

async function sendMessage() {
  const content = draft.value.trim()

  if (!content || isLoading.value || !userId.value) {
    return
  }

  errorMessage.value = ""
  isLoading.value = true
  pendingAssistantText.value = ""

  const optimisticUserMessage: MessageRecord = {
    id: `optimistic-${crypto.randomUUID()}`,
    tenant_id: tenantId.value,
    session_id: currentSessionId.value ?? "pending",
    user_id: userId.value,
    role: "user",
    content,
    citations: [],
    attached_files: sessionFiles.value.filter(file => selectedFileIds.value.includes(file.file_id)),
    created_at: new Date().toISOString(),
  }

  messages.value = [...messages.value, optimisticUserMessage]
  draft.value = ""

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: currentSessionId.value,
        userId: userId.value,
        message: content,
        fileIds: selectedFileIds.value,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error("Chat request failed")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      while (buffer.includes("\n\n")) {
        const boundaryIndex = buffer.indexOf("\n\n")
        const rawEvent = buffer.slice(0, boundaryIndex)
        buffer = buffer.slice(boundaryIndex + 2)

        const dataLine = rawEvent
          .split("\n")
          .find(line => line.startsWith("data: "))

        if (!dataLine) {
          continue
        }

        const payload = JSON.parse(dataLine.slice(6))

        if (payload.type === "session") {
          syncTenantId(payload.session.tenant_id)
          currentSessionId.value = payload.session.id
          setStoredSessionId(payload.session.id)
          applySessionsUpsert(payload.session)
        }

        if (payload.type === "message_saved") {
          syncTenantId(payload.message.tenant_id)
          messages.value = [...messages.value.slice(0, -1), payload.message]
        }

        if (payload.type === "assistant_delta") {
          pendingAssistantText.value += payload.delta
        }

        if (payload.type === "assistant_done") {
          syncTenantId(payload.message.tenant_id)
          messages.value = [...messages.value, payload.message]
          pendingAssistantText.value = ""
          applySessionsUpsert({
            id: payload.message.session_id,
            tenant_id: tenantId.value,
            user_id: userId.value,
            title: sessions.value.find(session => session.id === payload.message.session_id)?.title ?? "New chat",
            created_at: sessions.value.find(session => session.id === payload.message.session_id)?.created_at ?? payload.message.created_at,
            updated_at: payload.message.created_at,
          })
        }
      }
    }

    selectedFileIds.value = []
    await loadSessions()
  }
  catch (error) {
    messages.value = messages.value.filter(message => message.id !== optimisticUserMessage.id)
    pendingAssistantText.value = ""
    errorMessage.value = error instanceof Error ? error.message : "Unable to complete chat request"
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  userId.value = getStoredUserId()
  await loadSessions()

  const rememberedSessionId = getStoredSessionId()

  if (rememberedSessionId) {
    try {
      await loadMessages(rememberedSessionId)
      return
    }
    catch {
      setStoredSessionId(null)
    }
  }

  if (sessions.value[0]) {
    await loadMessages(sessions.value[0].id)
  }
})
</script>

<template>
  <main class="shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <p class="eyebrow">Multi-Tenant RAG Demo</p>
        <h1>{{ tenantId }}</h1>
        <p class="meta">Tenant scope is server-derived. Sessions are isolated by tenant and user.</p>
      </div>

      <button class="primary-button" type="button" @click="createSession">
        New session
      </button>

      <div class="session-list">
        <button
          v-for="session in sessions"
          :key="session.id"
          class="session-card"
          :class="{ active: session.id === currentSessionId }"
          type="button"
          @click="selectSession(session.id)"
        >
          <strong>{{ session.title }}</strong>
          <span>{{ new Date(session.updated_at).toLocaleString() }}</span>
        </button>
        <p v-if="sessions.length === 0" class="empty-state">
          No sessions yet. Start a conversation to create one.
        </p>
      </div>
    </aside>

    <section class="chat-panel">
      <header class="chat-header">
        <div>
          <p class="eyebrow">Chat</p>
          <h2>{{ currentSessionId ? "Session ready" : "Start a tenant-scoped conversation" }}</h2>
        </div>
        <p class="meta">User: {{ userId || "Loading..." }}</p>
      </header>

      <div class="thread">
        <article
          v-for="message in orderedMessages"
          :key="message.id"
          class="message"
          :class="message.role"
        >
          <p class="message-role">{{ message.role }}</p>
          <p class="message-content">{{ message.content }}</p>
          <ul v-if="message.attached_files.length > 0" class="attachment-list">
            <li v-for="file in message.attached_files" :key="file.file_id">
              {{ file.original_name }} · {{ formatFileSize(file.size_bytes) }} · {{ file.content_type }}
            </li>
          </ul>
          <ul v-if="message.citations.length > 0" class="citation-list">
            <li v-for="citation in message.citations" :key="citation.id">
              {{ citation.label }} · {{ citation.uri }}
            </li>
          </ul>
        </article>

        <p v-if="orderedMessages.length === 0" class="empty-state">
          Send the first message. The server will create a session if one does not exist.
        </p>
      </div>

      <form class="composer" @submit.prevent="sendMessage">
        <div class="attachment-panel">
          <div class="attachment-panel-header">
            <div>
              <p class="composer-label">Session files</p>
              <p class="meta">Upload PDF, DOCX, or TXT. Max 5 per request, 10MB each, 20 per session.</p>
            </div>
            <label class="upload-button">
              <input
                class="upload-input"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                :disabled="isUploading"
                @change="uploadSelectedFiles"
              >
              {{ isUploading ? "Uploading..." : "Upload files" }}
            </label>
          </div>

          <div v-if="sessionFiles.length > 0" class="attachment-grid">
            <button
              v-for="file in sessionFiles"
              :key="file.file_id"
              class="attachment-chip"
              :class="{ active: isFileSelected(file.file_id) }"
              type="button"
              @click="toggleFileSelection(file.file_id)"
            >
              <strong>{{ file.original_name }}</strong>
              <span>{{ formatFileSize(file.size_bytes) }} · {{ file.status }}</span>
            </button>
          </div>

          <p v-else class="empty-state">
            Upload a file to attach it to the next message in this session.
          </p>
        </div>

        <label class="composer-label" for="chat-input">Prompt</label>
        <textarea
          id="chat-input"
          v-model="draft"
          class="composer-input"
          rows="4"
          placeholder="Ask a tenant-scoped question"
        />
        <div class="composer-footer">
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
          <button class="primary-button" type="submit" :disabled="isLoading || !draft.trim()">
            {{ isLoading ? "Streaming..." : "Send" }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at top left, #f8e3c6 0%, #f1d8b5 22%, #d8c8ba 54%, #b2b7c6 100%);
  color: #201816;
}

:global(*) {
  box-sizing: border-box;
}

.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
}

.sidebar,
.chat-panel {
  border: 1px solid rgba(32, 24, 22, 0.1);
  border-radius: 1.5rem;
  background: rgba(255, 249, 241, 0.78);
  box-shadow: 0 18px 45px rgba(67, 52, 45, 0.12);
  backdrop-filter: blur(10px);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
}

.chat-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: calc(100vh - 3rem);
}

.sidebar-header,
.chat-header,
.composer {
  padding: 1.25rem;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(32, 24, 22, 0.08);
}

.eyebrow,
.message-role,
.composer-label {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  color: #865d37;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 0.95;
}

h2 {
  font-size: clamp(1.4rem, 3vw, 2rem);
}

.meta {
  color: #5f4d45;
  line-height: 1.5;
}

.primary-button,
.session-card {
  border: 0;
  border-radius: 1rem;
  font: inherit;
}

.primary-button {
  padding: 0.9rem 1.15rem;
  background: linear-gradient(135deg, #1f6b5e, #2f8d7b);
  color: #f8f4ed;
  cursor: pointer;
}

.primary-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.session-list {
  display: grid;
  gap: 0.75rem;
  overflow: auto;
}

.session-card {
  display: grid;
  gap: 0.35rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.72);
  text-align: left;
  cursor: pointer;
}

.session-card span {
  color: #6a5a52;
  font-size: 0.88rem;
}

.session-card.active {
  outline: 2px solid #1f6b5e;
  background: rgba(226, 247, 239, 0.96);
}

.thread {
  display: grid;
  gap: 1rem;
  align-content: start;
  padding: 1.25rem;
  overflow: auto;
}

.message {
  max-width: min(42rem, 100%);
  padding: 1rem 1.1rem;
  border-radius: 1.2rem;
  background: rgba(255, 255, 255, 0.9);
}

.message.user {
  justify-self: end;
  background: rgba(31, 107, 94, 0.12);
}

.message.assistant {
  justify-self: start;
}

.message-content {
  white-space: pre-wrap;
  line-height: 1.6;
}

.citation-list {
  margin: 0.85rem 0 0;
  padding-left: 1.2rem;
  color: #5f4d45;
}

.attachment-list {
  margin: 0.85rem 0 0;
  padding-left: 1.2rem;
  color: #5f4d45;
}

.composer {
  border-top: 1px solid rgba(32, 24, 22, 0.08);
  display: grid;
  gap: 0.75rem;
}

.attachment-panel {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid rgba(32, 24, 22, 0.08);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.58);
}

.attachment-panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 1rem;
  border-radius: 1rem;
  background: rgba(32, 24, 22, 0.08);
  cursor: pointer;
}

.upload-input {
  display: none;
}

.attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem;
}

.attachment-chip {
  display: grid;
  gap: 0.35rem;
  padding: 0.85rem;
  border: 1px solid rgba(32, 24, 22, 0.12);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.8);
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.attachment-chip span {
  color: #6a5a52;
  font-size: 0.88rem;
}

.attachment-chip.active {
  border-color: #1f6b5e;
  background: rgba(226, 247, 239, 0.96);
}

.composer-input {
  width: 100%;
  resize: vertical;
  padding: 1rem;
  border: 1px solid rgba(32, 24, 22, 0.14);
  border-radius: 1rem;
  font: inherit;
  background: rgba(255, 255, 255, 0.8);
}

.composer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.empty-state,
.error-text {
  color: #6d554a;
  line-height: 1.5;
}

.error-text {
  color: #9b2c2c;
}

@media (max-width: 900px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .chat-panel {
    min-height: 70vh;
  }

  .chat-header,
  .composer-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
