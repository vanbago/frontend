// src/services/auth.ts
class AuthService {
  private ACCESS_TOKEN_KEY = 'optis_access_token'
  private REFRESH_TOKEN_KEY = 'optis_refresh_token'

  // 1. On définit l'URL racine de ton API Django
  private BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

  redirectToLogin() {
    window.location.href = '/login'
  }
  
  // accessor pour l'URL de base (pratique pour les composants qui en ont besoin)
  
  getBaseURL() {
    return this.BASE_URL
  }

  async login(username: string, password: string) {
    // 2. On utilise la vraie route JWT définie dans urls.py
    const response = await fetch(`${this.BASE_URL}/api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    
    // 3. Sécurité : On vérifie que les identifiants sont bons avant de continuer
    if (!response.ok) {
      throw new Error('Identifiants incorrects ou problème serveur')
    }

    const data = await response.json()
    
    // 4. On stocke les jetons
    localStorage.setItem(this.ACCESS_TOKEN_KEY, data.access)
    localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refresh)
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }

  // Tente de renouveler l'access token via le refresh token
  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY)
    if (!refreshToken) return false

    try {
      const response = await fetch(`${this.BASE_URL}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
      })

      if (!response.ok) {
        // Refresh token expiré ou invalide → déconnexion forcée et redirection
        this.logout()
        this.redirectToLogin()
        return false
      }

      const data = await response.json()
      localStorage.setItem(this.ACCESS_TOKEN_KEY, data.access)
      return true
    } catch {
      this.logout()
      this.redirectToLogin()
      return false
    }
  }

  //  L'intercepteur blindé avec retry automatique sur 401
  async apiCall(url: string, options: RequestInit = {}) {
    const buildHeaders = (token: string | null): Record<string, string> => {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(options.headers as Record<string, string> || {})
      }
      if (token) headers['Authorization'] = `Bearer ${token}`
      return headers
    }

    // 1. Première tentative avec le token actuel
    const reponse = await fetch(url, {
      ...options,
      headers: buildHeaders(this.getAccessToken())
    })

    // 2. Si 401 → on tente de rafraîchir le token et on rejoue
    if (reponse.status === 401) {
      const refreshOk = await this.refreshAccessToken()
      if (!refreshOk) return reponse // Refresh échoué, on retourne le 401

      return fetch(url, {
        ...options,
        headers: buildHeaders(this.getAccessToken())
      })
    }

    return reponse
  }

  logout() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
  }
}

export default new AuthService()