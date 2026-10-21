<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import { useFilterStore } from "@/stores/filterStore";
import { useItemsMenu } from "@/composables/useItemsMenu";
import { useTenantStore } from "@/stores/tenantStore";
import { useLogStore } from "@/stores/logStore";
import DiagnosticDialog from "@/components/common/DiagnosticDialog.vue";

const { setItemsMenu } = useItemsMenu();
const tenantStore = useTenantStore();
const logStore = useLogStore();

const user = useUserStore();
const router = useRouter();
const filterStore = useFilterStore();

const showPassword = ref(false);
const userInput = ref({
  username: "",
  password: "",
  email: "",
});

const dialog = ref(false);
const isTechnicalError = ref(false);
const text = ref("");
const overlay = ref(false);
const attempts = ref(0);
const forgot = ref(false);

const login = async () => {
  overlay.value = true;
  await user.loginUserName(userInput.value.username, userInput.value.password);
  overlay.value = false;

  if (user.auth) {
    overlay.value = true;
    await filterStore.setPer();
    await filterStore.setConfig();
    await user.fetchRol();
    setItemsMenu(user.rol);
    overlay.value = false;
    router.push("/");
    return;
  }

  attempts.value++;
  if (user.lastError) {
    isTechnicalError.value = true;
    dialog.value = true;
  } else {
    isTechnicalError.value = false;
    text.value = "El usuario o la contraseña ingresada es incorrecta.";
    dialog.value = true;
  }
};

async function sendEmail() {
  overlay.value = true;
  await user.fetchUserEmail(userInput.value.email);
  forgot.value = false;
  overlay.value = false;
}

function openDiagnosticsFromError() {
  dialog.value = false;
  logStore.openDialog();
}
</script>

<template>
  <v-container
    class="fill-height d-flex flex-column align-center justify-center"
  >
    <v-card width="460" class="mx-auto elevation-4 rounded-lg">
      <!-- Encabezado con Municipio Activo -->
      <div class="pa-5 bg-grey-lighten-4 rounded-t-lg border-b text-center">
        <v-avatar
          size="64"
          class="mb-2 elevation-1"
          rounded="sm"
          :color="
            tenantStore.activeTenantId === 'desarrollo'
              ? 'deep-purple-darken-1'
              : undefined
          "
        >
          <v-icon
            v-if="tenantStore.activeTenantId === 'desarrollo'"
            icon="mdi-flask"
            size="x-large"
            color="white"
          ></v-icon>
          <v-img
            v-else-if="tenantStore.tenantLogo"
            :src="tenantStore.tenantLogo"
            alt="Logo"
          />
          <v-icon
            v-else
            icon="mdi-city"
            size="x-large"
            color="primary"
          ></v-icon>
        </v-avatar>
        <h2 class="text-h6 font-weight-bold mb-0 text-primary">
          {{ tenantStore.tenantName }}
        </h2>
        <div class="text-caption text-medium-emphasis">
          {{ tenantStore.tenantLocation }}
        </div>
      </div>

      <v-card-text class="pa-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">Acceso al sistema</h3>
        <v-form v-if="!forgot" @submit.prevent="login">
          <v-text-field
            v-model="userInput.username"
            label="Usuario"
            prepend-inner-icon="mdi-account-circle"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model="userInput.password"
            :type="showPassword ? 'text' : 'password'"
            label="Contraseña"
            prepend-inner-icon="mdi-lock"
            variant="outlined"
            density="comfortable"
            :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append-inner="showPassword = !showPassword"
          />
          <div class="d-flex justify-end mt-2">
            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              class="elevation-1"
            >
              Ingresar
            </v-btn>
          </div>
        </v-form>

        <v-form v-if="forgot" @submit.prevent="sendEmail">
          <v-text-field
            v-model="userInput.email"
            label="Correo electrónico"
            prepend-inner-icon="mdi-email"
            variant="outlined"
            density="comfortable"
            type="email"
          />
          <div class="d-flex justify-end gap-2 mt-2">
            <v-btn variant="text" @click="forgot = false">Cancelar</v-btn>
            <v-btn type="submit" color="primary">Enviar</v-btn>
          </div>
        </v-form>
      </v-card-text>

      <!-- Pie de tarjeta con acceso a diagnóstico -->
      <div
        class="pa-3 bg-grey-lighten-4 border-t d-flex align-center justify-space-between"
      >
        <v-btn
          variant="text"
          size="x-small"
          color="primary"
          prepend-icon="mdi-bug-outline"
          class="text-none"
          @click="logStore.openDialog"
        >
          Diagnóstico y Logs del Sistema
        </v-btn>
        <span class="text-caption text-medium-emphasis">v1.0.0</span>
      </div>
    </v-card>

    <!-- Diálogo de Error / Notificación -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card class="rounded-lg">
        <v-card-title
          v-if="isTechnicalError"
          class="pa-4 bg-red-lighten-5 d-flex align-center text-error"
        >
          <v-icon
            icon="mdi-alert-circle-outline"
            class="me-2"
            color="error"
          ></v-icon>
          <span class="text-subtitle-1 font-weight-bold"
            >Error de Conexión — {{ tenantStore.tenantName }}</span
          >
        </v-card-title>
        <v-card-title v-else class="pa-4 d-flex align-center">
          <v-icon
            icon="mdi-information-outline"
            class="me-2"
            color="primary"
          ></v-icon>
          <span class="text-subtitle-1 font-weight-bold"
            >Información de Acceso</span
          >
        </v-card-title>

        <v-card-text class="pa-4">
          <div v-if="isTechnicalError">
            <p class="mb-2">
              No se pudo establecer comunicación con el servidor de
              <strong>{{ tenantStore.tenantName }}</strong
              >.
            </p>
            <v-alert
              type="error"
              variant="tonal"
              density="compact"
              class="text-caption font-mono mb-3"
            >
              <div>
                <strong>Estado:</strong>
                {{
                  user.lastError?.status
                    ? user.lastError.status +
                      " (" +
                      user.lastError.statusText +
                      ")"
                    : user.lastError?.statusText
                }}
              </div>
              <div class="text-truncate">
                <strong>URL:</strong> {{ user.lastError?.url }}
              </div>
              <div v-if="user.lastError?.message" class="mt-1">
                <strong>Mensaje:</strong> {{ user.lastError.message }}
              </div>
            </v-alert>
            <p class="text-caption text-medium-emphasis mb-0">
              Puedes abrir el panel de diagnóstico para verificar el endpoint,
              cambiar la URL o probar la conectividad (ping).
            </p>
          </div>
          <div v-else>
            {{ text }}
          </div>
        </v-card-text>

        <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
          <v-btn
            v-if="isTechnicalError"
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-bug"
            @click="openDiagnosticsFromError"
          >
            Ver Diagnóstico y Logs
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="grey-darken-2"
            variant="text"
            size="small"
            @click="dialog = false"
          >
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Overlay de Carga -->
    <v-overlay
      :model-value="overlay"
      persistent
      class="align-center justify-center"
    >
      <v-progress-circular
        color="primary"
        size="64"
        indeterminate
      ></v-progress-circular>
    </v-overlay>

    <!-- Componente Global de Diagnóstico -->
    <DiagnosticDialog />
  </v-container>
</template>

<style scoped>
.font-mono {
  font-family: monospace;
}
.gap-2 {
  gap: 8px;
}
</style>
