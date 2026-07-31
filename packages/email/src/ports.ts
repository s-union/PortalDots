export interface OutgoingMessage {
  to: string[]
  bcc?: string[]
  from: string
  subject: string
  html: string
  text: string
}

export interface MailTransport {
  send(message: OutgoingMessage): Promise<void>
}

export interface JobQueue<T = unknown> {
  send(message: T): Promise<void>
  sendBatch?(messages: readonly T[]): Promise<void>
}

export interface QueueMessage<T = unknown> {
  readonly body: T
  ack(): Promise<void>
  retry(): Promise<void>
}
