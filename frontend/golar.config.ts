import '@golar/vue'
import { defineConfig } from 'golar/unstable'

export default defineConfig({
  typecheck: {
    include: ['src/**/*.ts', 'src/**/*.vue', 'typed-router.d.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts']
  }
})
