const API_URL = import.meta.env.VITE_API_URL || '/api'
async function post(path, payload){
  const response = await fetch(`${API_URL}${path}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
  if(!response.ok) throw new Error(`API error ${response.status}`)
  return response.json()
}
export const submitLead = (payload) => post('/leads', payload)
export const submitService = (payload) => post('/service-requests', payload)
