import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import App from '@/app/App.vue'
import { pinia } from '@/app/providers/pinia'
import { router } from '@/app/router'
import { queryClient } from '@/app/providers/queryClient'
import { initTemporal } from '@/lib/temporal'
import { initializeFontAwesome } from '@/lib/icons/fontawesome'
import { initializeUiTheme } from '@/features/session/theme'
import '@/styles/app.css'

await initTemporal()

initializeFontAwesome()
initializeUiTheme()

const app = createApp(App)

app.component('FontAwesomeIcon', FontAwesomeIcon)
app.use(pinia)
app.use(router)
app.use(VueQueryPlugin, { queryClient })

app.mount('#v2-app')
