import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import '@fortawesome/fontawesome-free/css/all.min.css'
import App from '@/app/App.vue'
import { pinia } from '@/app/providers/pinia'
import { router } from '@/app/router'
import { queryClient } from '@/app/providers/queryClient'
import { initializeUiTheme } from '@/features/session/theme'
import '@/styles/app.css'

initializeUiTheme()

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin, { queryClient })

app.mount('#v2-app')
