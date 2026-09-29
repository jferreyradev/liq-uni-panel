import '@mdi/font/css/materialdesignicons.css'

import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi'
  },
  theme: {
    defaultTheme: 'light'
  }
})

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
