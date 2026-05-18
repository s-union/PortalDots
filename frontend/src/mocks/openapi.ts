import { HttpResponse } from 'msw'
import { createOpenApiHttp } from 'openapi-msw'

type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch'
interface StoryOperation {
  parameters: {
    path: Record<string, string>
    query?: Record<string, string | number | boolean | string[] | number[] | boolean[]>
  }
  requestBody?: {
    content: {
      'application/json': unknown
    }
  }
  responses: Record<
    string,
    {
      content: {
        'application/json': unknown
      }
    }
  >
}
type StoryPaths = Record<`/v1/${string}`, Record<HttpMethod, StoryOperation>>

export const openApiHttp = createOpenApiHttp<StoryPaths>()
export const http = openApiHttp
export { HttpResponse }
