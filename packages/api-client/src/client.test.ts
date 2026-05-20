import { describe, expect, it } from 'vitest'
import { expectApiData, expectApiNoContent } from './client'

// テスト用のApiResultヘルパー
function makeResult<T>(status: number, data: T | undefined, error?: unknown) {
  return {
    data,
    error,
    response: new Response(null, { status })
  }
}

describe('expectApiData', () => {
  it('レスポンスが正常でdataがあれば値を返す', () => {
    const result = makeResult(200, { id: '1', name: 'テスト' })
    expect(expectApiData(result, '失敗')).toEqual({ id: '1', name: 'テスト' })
  })

  it('レスポンスが正常でもdataがundefinedならエラーをスロー', () => {
    const result = makeResult(200, undefined)
    expect(() => expectApiData(result, '取得失敗')).toThrow('取得失敗')
  })

  it('レスポンスがエラー(4xx)ならエラーをスロー', () => {
    const result = makeResult(404, undefined, { message: 'not found' })
    expect(() => expectApiData(result, '見つかりません')).toThrow('見つかりません')
  })

  it('レスポンスがエラー(5xx)ならエラーをスロー', () => {
    const result = makeResult(500, undefined, 'server error')
    expect(() => expectApiData(result, 'サーバーエラー')).toThrow('サーバーエラー')
  })

  it('ステータスに対応するerrorParserがあればcauseに適用される', () => {
    const rawError = { message: 'Validation failed', errors: { name: ['必須'] } }
    const result = makeResult(422, undefined, rawError)
    const parsedError = { parsed: true }
    const errorParsers = { 422: () => parsedError }

    let caught: unknown
    try {
      expectApiData(result, 'バリデーションエラー', errorParsers)
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error & { cause?: unknown }).cause).toEqual(parsedError)
  })

  it('ステータスに対応するerrorParserがなければrawエラーがcauseになる', () => {
    const rawError = { message: 'not found' }
    const result = makeResult(404, undefined, rawError)
    const errorParsers = { 422: () => ({ parsed: true }) }

    let caught: unknown
    try {
      expectApiData(result, 'not found', errorParsers)
    } catch (e) {
      caught = e
    }

    expect((caught as Error & { cause?: unknown }).cause).toEqual(rawError)
  })
})

describe('expectApiNoContent', () => {
  it('レスポンスが正常(204)ならエラーをスローしない', () => {
    const result = makeResult(204, undefined)
    expect(() => expectApiNoContent(result, '失敗')).not.toThrow()
  })

  it('レスポンスが正常(200)ならエラーをスローしない', () => {
    const result = makeResult(200, undefined)
    expect(() => expectApiNoContent(result, '失敗')).not.toThrow()
  })

  it('レスポンスがエラー(4xx)ならエラーをスロー', () => {
    const result = makeResult(403, undefined, 'forbidden')
    expect(() => expectApiNoContent(result, '権限がありません')).toThrow('権限がありません')
  })

  it('ステータスに対応するerrorParserがあればcauseに適用される', () => {
    const rawError = { message: 'Validation failed', errors: {} }
    const result = makeResult(422, undefined, rawError)
    const parsedError = { parsed: true }
    const errorParsers = { 422: () => parsedError }

    let caught: unknown
    try {
      expectApiNoContent(result, 'バリデーションエラー', errorParsers)
    } catch (e) {
      caught = e
    }

    expect((caught as Error & { cause?: unknown }).cause).toEqual(parsedError)
  })
})
