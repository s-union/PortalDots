import 'temporal-polyfill-lite/global'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './server'

// jsdom does not implement HTMLDialogElement's imperative API. Provide a minimal
// stand-in so components built on <dialog> can be exercised in unit tests.
if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  const dialogPrototype = HTMLDialogElement.prototype
  dialogPrototype.show = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  dialogPrototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  dialogPrototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    if (returnValue !== undefined) {
      this.returnValue = returnValue
    }
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
