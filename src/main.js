import '@mdi/font/css/materialdesignicons.css'

import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { setupHttpLogger } from '@/utils/httpLogger'

// Inicializar logger de red para consola de inspección
setupHttpLogger()

// Vuetify
import 'vuetify/styles'
import { createAppVuetify } from '@/plugins/vuetify'

const vuetify = createAppVuetify()

// Initialize and activate Pinia before importing components and router
const pinia = createPinia()
setActivePinia(pinia)

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(vuetify)

app.mount('#app')
