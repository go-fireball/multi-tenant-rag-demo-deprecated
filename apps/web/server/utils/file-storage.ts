interface SaveObjectInput {
  fileId: string
  tenantId: string
  userId: string
  sessionId: string
  fileName: string
  contentType: string
  bytes: Uint8Array
}

interface StoredObjectRecord {
  bucket: string
  key: string
  sizeBytes: number
}

interface FileStorage {
  saveFiles(inputs: SaveObjectInput[]): StoredObjectRecord[]
}

class InMemoryFileStorage implements FileStorage {
  private readonly bucket = "tenant-session-files-local"
  private objects = new Map<string, Uint8Array>()

  saveFiles(inputs: SaveObjectInput[]) {
    const staged = inputs.map(input => {
      const key = `${input.tenantId}/${input.userId}/${input.sessionId}/${input.fileId}/${input.fileName}`
      return {
        bucket: this.bucket,
        key,
        sizeBytes: input.bytes.byteLength,
        bytes: input.bytes,
      }
    })

    for (const object of staged) {
      this.objects.set(object.key, object.bytes)
    }

    return staged.map(({ bucket, key, sizeBytes }) => ({
      bucket,
      key,
      sizeBytes,
    }))
  }
}

declare global {
  var __fileStorage__: FileStorage | undefined
}

export function useFileStorage() {
  if (!globalThis.__fileStorage__) {
    globalThis.__fileStorage__ = new InMemoryFileStorage()
  }

  return globalThis.__fileStorage__
}
