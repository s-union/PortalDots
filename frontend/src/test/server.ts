import { setupServer } from 'msw/node'
import { defaultHandlers } from '@/mocks/handlers'

export const server = setupServer(...defaultHandlers)
