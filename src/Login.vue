<template>
  <div class="flex items-center justify-center h-screen bg-slate-900">
    <form @submit.prevent="gererConnexion" class="bg-white p-8 rounded-lg shadow-xl w-96 border-t-4 border-blue-500">
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">OPTIS_OTN</h2>
        <p class="text-xs text-gray-500 mt-1">Authentification requise</p>
      </div>
      
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2">Nom d'utilisateur</label>
        <input v-model="username" type="text" class="w-full px-3 py-2 border rounded bg-gray-50 focus:outline-none focus:border-blue-500" required>
      </div>
      
      <div class="mb-6">
        <label class="block text-gray-700 text-sm font-bold mb-2">Mot de passe</label>
        <input v-model="password" type="password" class="w-full px-3 py-2 border rounded bg-gray-50 focus:outline-none focus:border-blue-500" required>
      </div>
      
      <p v-if="erreur" class="text-red-500 text-xs italic mb-4 text-center">{{ erreur }}</p>
      
      <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors" :disabled="chargement">
        {{ chargement ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from './services/auth'  // On appelle ton garde du corps

const username = ref('')
const password = ref('')
const erreur = ref('')
const chargement = ref(false)
const router = useRouter()

const gererConnexion = async () => {
  try {
    erreur.value = ''
    chargement.value = true
    
    // 1. On va chercher le token JWT
    await AuthService.login(username.value, password.value)
    
    // 2. Si ça marche, on ouvre les portes vers la carte !
    router.push('/')
    
  } catch (e) {
    erreur.value = 'Identifiants incorrects ou serveur hors ligne.'
  } finally {
    chargement.value = false
  }
}
</script>