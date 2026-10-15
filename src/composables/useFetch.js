import { watchEffect, ref } from 'vue'
import { useEndPoints } from '@/composables/useEndPoints'

export function useFetch(getUrl, getOptions = () => ({})) {
    const data = ref(null)
    const error = ref(null)
    const isPending = ref(true)

    const { getBoletasHeaders } = useEndPoints()

    watchEffect(() => {
      isPending.value = true
      data.value = null
      error.value = null

      const userOptions = getOptions()
      const options = {
        ...userOptions,
        headers: {
          ...getBoletasHeaders(),
          ...(userOptions.headers || {})
        }
      }

      fetch(getUrl(), options)
        .then(async (res) => {
          if (res.status === 404) return []
          const text = await res.text()
          if (!text || text.trim() === '') return []
          try {
            const parsed = JSON.parse(text)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.error) {
              throw new Error(parsed.error)
            }
            return parsed
          } catch (err) {
            if (err.message && !err.message.includes('JSON')) throw err
            return []
          }
        })
        .then((_data) => {
          data.value = _data
          isPending.value = false
        })
        .catch((err) => {
          error.value = err
          isPending.value = false
        })
    })
    return {
      data,
      error,
      isPending
    }
  }