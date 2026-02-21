export const checkSupabaseConnection = async () => {
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); 

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 401; 
  } catch (err) {
    return false;
  }
};