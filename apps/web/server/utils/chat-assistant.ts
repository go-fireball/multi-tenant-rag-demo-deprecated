import type { ChatCitationRecord, ChatMessageRecord } from "./chat-store"

interface AssistantReply {
  content: string
  citations: ChatCitationRecord[]
}

export function generateAssistantReply(input: {
  tenantId: string
  userMessage: string
  history: ChatMessageRecord[]
}): AssistantReply {
  const trimmedMessage = input.userMessage.trim()
  const priorTurns = excludeCurrentUserTurn(input.history, trimmedMessage)
  const recentTurns = priorTurns.slice(-3)
  const recentAttachedFiles = recentTurns
    .flatMap(message => message.attached_files)
    .filter((file, index, files) => files.findIndex(entry => entry.file_id === file.file_id) === index)
    .slice(-4)
  const attachmentSummary = recentAttachedFiles.length
    ? recentAttachedFiles
      .map(file => `${file.original_name} (${file.content_type}, ${file.size_bytes} bytes)`)
      .join(" | ")
    : ""

  const content = recentAttachedFiles.length
    ? [
      `I can't provide a grounded tenant knowledge base answer for "${trimmedMessage}" in this local environment because no retrieved KB evidence is available.`,
      `The only session-scoped evidence I can point to right now is the attached file metadata: ${attachmentSummary}.`,
      "Ask about one of those files after relevant content is attached or after the Bedrock grounding path is wired in.",
    ].join(" ")
    : [
      `I can't provide a grounded tenant knowledge base answer for "${trimmedMessage}" in this local environment because no retrieved KB evidence is available.`,
      `No attached session files were available in recent turns for tenant ${input.tenantId}.`,
      "Upload a relevant document or use the Bedrock-backed path before relying on an answer here.",
    ].join(" ")

  return {
    content,
    citations: [],
  }
}

function excludeCurrentUserTurn(history: ChatMessageRecord[], userMessage: string) {
  const lastMessage = history.at(-1)

  if (
    lastMessage?.role === "user"
    && lastMessage.content.trim() === userMessage
  ) {
    return history.slice(0, -1)
  }

  return history
}
