import { createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, sessionBootstrapSchema } from '@/lib/api/schema'
import { useSessionStore, type SessionBootstrap } from './store'

export async function fetchSessionBootstrap() {
  return $api.queryData(
    'get',
    '/session/bootstrap',
    {
      headers: createJsonHeaders()
    },
    parseSessionBootstrap,
    {
      errorMessage: 'Failed to fetch session bootstrap'
    }
  )
}

export function useSessionBootstrapQuery() {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/session/bootstrap',
    {
      headers: createJsonHeaders()
    },
    (value) => {
      const session = parseSessionBootstrap(value)
      sessionStore.hydrate(session)
      return session
    },
    {
      queryKey: ['session', 'bootstrap'],
      retry: false
    },
    {
      errorMessage: 'Failed to fetch session bootstrap'
    }
  )
}

function parseSessionBootstrap(value: unknown): SessionBootstrap {
  return parseWithSchema(sessionBootstrapSchema, value, 'session bootstrap')
}
