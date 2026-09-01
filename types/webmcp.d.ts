export interface WebMCPTool {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  execute(input: unknown, context: { signal: AbortSignal }): Promise<unknown> | unknown
  annotations?: {
    readOnlyHint?: boolean
    untrustedContentHint?: boolean
  }
}

export interface WebMCPModelContext {
  registerTool(tool: WebMCPTool, options?: { signal?: AbortSignal; exposedTo?: string[] }): Promise<undefined>
}

declare global {
  interface Document {
    modelContext?: WebMCPModelContext
  }
}

export {}
