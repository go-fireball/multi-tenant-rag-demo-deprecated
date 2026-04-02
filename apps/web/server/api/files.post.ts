import type { MultiPartData } from "h3"
import { useChatStore } from "../utils/chat-store"
import { useFileStorage } from "../utils/file-storage"
import { getTenantId } from "../utils/tenant"

const MAX_FILES_PER_REQUEST = 5
const MAX_FILES_PER_SESSION = 20
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
])

function readTextPart(part?: MultiPartData) {
  if (!part?.data) {
    return ""
  }

  return new TextDecoder().decode(part.data).trim()
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim()
  const collapsedWhitespace = trimmed.replace(/\s+/g, "-")
  const sanitized = collapsedWhitespace.replace(/[^A-Za-z0-9._-]/g, "-")
  const compacted = sanitized.replace(/-+/g, "-").replace(/^[.-]+|[.-]+$/g, "")
  return compacted || "file"
}

export default defineEventHandler(async event => {
  const tenantId = getTenantId()
  const store = useChatStore()
  const storage = useFileStorage()
  const parts = await readMultipartFormData(event)

  if (!parts?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "multipart/form-data request is required",
    })
  }

  const userId = readTextPart(parts.find(part => part.name === "userId"))
  const sessionId = readTextPart(parts.find(part => part.name === "sessionId"))
  const fileParts = parts.filter(part => part.name === "files" && part.filename)

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId form field is required",
    })
  }

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "sessionId form field is required",
    })
  }

  const session = store.getSession({
    tenantId,
    sessionId,
    userId,
  })

  if (!session) {
    throw createError({
      statusCode: 404,
      statusMessage: "Session not found",
    })
  }

  if (!fileParts.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one file is required",
    })
  }

  if (fileParts.length > MAX_FILES_PER_REQUEST) {
    throw createError({
      statusCode: 400,
      statusMessage: `A maximum of ${MAX_FILES_PER_REQUEST} files may be uploaded per request`,
    })
  }

  const existingFiles = store.listSessionFiles({
    tenantId,
    sessionId,
    userId,
  })

  if (existingFiles.length + fileParts.length > MAX_FILES_PER_SESSION) {
    throw createError({
      statusCode: 400,
      statusMessage: `A session may contain at most ${MAX_FILES_PER_SESSION} files`,
    })
  }

  const stagedFiles = fileParts.map(part => {
    const originalName = part.filename?.trim() ?? ""
    const contentType = part.type?.trim() ?? ""
    const sizeBytes = part.data?.byteLength ?? 0

    if (!originalName) {
      throw createError({
        statusCode: 400,
        statusMessage: "Each uploaded file must include a filename",
      })
    }

    if (!allowedMimeTypes.has(contentType)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unsupported file type for ${originalName}`,
      })
    }

    if (sizeBytes === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `${originalName} is empty`,
      })
    }

    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw createError({
        statusCode: 400,
        statusMessage: `${originalName} exceeds the 10MB per-file limit`,
      })
    }

    return {
      fileId: crypto.randomUUID(),
      originalName,
      sanitizedName: sanitizeFileName(originalName),
      contentType,
      bytes: part.data,
    }
  })

  const savedObjects = storage.saveFiles(stagedFiles.map(file => ({
    fileId: file.fileId,
    tenantId,
    userId,
    sessionId,
    fileName: file.sanitizedName,
    contentType: file.contentType,
    bytes: file.bytes,
  })))

  const createdFiles = store.createSessionFiles({
    tenantId,
    sessionId,
    userId,
    files: stagedFiles.map((file, index) => ({
      file_id: file.fileId,
      original_name: file.originalName,
      sanitized_name: file.sanitizedName,
      content_type: file.contentType,
      size_bytes: file.bytes.byteLength,
      storage_bucket: savedObjects[index].bucket,
      storage_key: savedObjects[index].key,
      status: "ready",
    })),
  })

  return {
    tenantId,
    sessionId,
    files: createdFiles,
  }
})
