import { ref } from 'vue'
import { log } from '@/utils/logger'
import API_URL from '@/config/api' // Import the globally configured API URL

export function useApi() {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)
  const responseStatus = ref(null)

  const fetchData = async (endpoint, options = {}) => {
    loading.value = true
    error.value = null
    responseStatus.value = null
    const token = localStorage.getItem('token')

    // Ensure the endpoint starts with a slash if it's relative
    const formattedEndpoint = endpoint.startsWith('http') ? endpoint : (endpoint.startsWith('/') ? endpoint : `/${endpoint}`)
    
    // Construct the full URL using the imported API_URL for relative endpoints
    const url = formattedEndpoint.startsWith('http') ? formattedEndpoint : `${API_URL}${formattedEndpoint}`

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    }

    const mergedOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    if (import.meta.env.DEV) {
      log('info', 'useApi', 'Requesting:', { 
          url, 
          method: mergedOptions.method || 'GET', 
          // Avoid logging sensitive headers like Authorization in production logs
          headers: { ...mergedOptions.headers, ...(token && { 'Authorization': 'Bearer [REDACTED]' }) }, 
          body: mergedOptions.body 
      })
    }

    try {
      const response = await fetch(url, mergedOptions)
      responseStatus.value = response.status

      if (!response.ok) {
        let errorBody = null
        try {
          // Try to parse error response body
          errorBody = await response.json()
        } catch {
          // If parsing fails, use the status text
          errorBody = { message: response.statusText }
        }
        error.value = { 
          status: response.status, 
          message: errorBody?.message || 'An error occurred', 
          details: errorBody 
        }
        log('error', 'useApi', 'Fetch error:', error.value)
        data.value = null // Clear data on error
        return null // Return null to indicate failure
      }

      // Handle potential empty response body (e.g., 204 No Content)
      if (response.status === 204) {
        data.value = null // Or maybe an empty object/array depending on expectations
      } else {
        try {
          data.value = await response.json()
        } catch (parseError) {
           error.value = { 
            status: 'ParsingError', 
            message: 'Failed to parse JSON response', 
            details: parseError 
          }
          log('error', 'useApi', 'JSON Parsing Error:', { url, error: parseError })
          data.value = null
          return null // Indicate failure
        }
      }
      
      if (import.meta.env.DEV) {
        log('info', 'useApi', 'Fetch success:', { url, status: response.status, responseData: data.value })
      }
      return data.value

    } catch (err) {
      error.value = { 
        status: 'NetworkError', 
        message: err.message || 'Network error or request failed', 
        details: err 
      }
      log('error', 'useApi', 'Network/Fetch Exception:', { url, error: err })
      data.value = null
      responseStatus.value = null // Reset status on network error
      return null // Return null on exception
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, responseStatus, fetchData }
}