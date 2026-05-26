import { ref, computed } from 'vue'
import AuthService from '../services/auth'

const BASE_URL = AuthService.getBaseURL()

type EtapeDistance = 'idle' | 'attend_premier' | 'attend_second' | 'calcul' | 'resultat'

interface NoeudCapture {
  id: string
  nom: string
}

interface ResultatDistance {
  distance_metres: number
  distance_lisible: string
  cable_id: string | null
  cable_nom: string | null
  source: 'mesure_terrain' | 'calcul_geometrique' | 'identique'
  type: 'direct' | 'transit' | 'meme_noeud'
}

export function useDistance() {
  const etape = ref<EtapeDistance>('idle')
  const premierNoeud = ref<NoeudCapture | null>(null)
  const secondNoeud = ref<NoeudCapture | null>(null)
  const resultat = ref<ResultatDistance | null>(null)
  const erreur = ref<string | null>(null)

  // Vrai quand l'UI doit intercepter les clics sur les nœuds
  const actif = computed(() =>
    etape.value === 'attend_premier' || etape.value === 'attend_second'
  )

  const demarrer = () => {
    etape.value = 'attend_premier'
    premierNoeud.value = null
    secondNoeud.value = null
    resultat.value = null
    erreur.value = null
  }

  const annuler = () => {
    etape.value = 'idle'
    premierNoeud.value = null
    secondNoeud.value = null
    resultat.value = null
    erreur.value = null
  }

  const capturerNoeud = async (noeud: NoeudCapture) => {
    if (etape.value === 'attend_premier') {
      premierNoeud.value = noeud
      etape.value = 'attend_second'
      return
    }
    if (etape.value === 'attend_second') {
      if (noeud.id === premierNoeud.value?.id) {
        erreur.value = 'Sélectionnez un nœud différent du premier.'
        return
      }
      secondNoeud.value = noeud
      await calculer()
    }
  }

  const calculer = async () => {
    if (!premierNoeud.value || !secondNoeud.value) return
    etape.value = 'calcul'
    erreur.value = null
    try {
      const response = await AuthService.apiCall(
        `${BASE_URL}/api/noeuds/${premierNoeud.value.id}/distance_vers/${secondNoeud.value.id}/`
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        erreur.value = data.erreur || `Erreur ${response.status}`
      } else {
        resultat.value = await response.json()
      }
    } catch (e) {
      erreur.value = e instanceof Error ? e.message : 'Erreur réseau'
    } finally {
      etape.value = 'resultat'
    }
  }

  const fermerResultat = () => annuler()

  return {
    etape, actif, premierNoeud, secondNoeud, resultat, erreur,
    demarrer, annuler, capturerNoeud, fermerResultat,
  }
}