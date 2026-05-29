import { ref } from 'vue'
import AuthService from '../services/auth'

const BASE_URL = AuthService.getBaseURL()

export interface NoeudTrace {
  id: string; nom: string; type: string; type_label: string; actif: boolean
}
export interface FibreLabel {
  fibre_id: string; cable: string; tube: number; numero: number; label: string
}
export interface EtapeTrace {
  type: 'CABLE' | 'SOUDURE' | 'FIN' | 'FIN_ODF' | 'FIN_FRONTIERE' | 'ERREUR'
  nom?: string; brin?: string; longueur?: string; source_longueur?: string
  soudure_id?: string; lieu?: string; statut?: string; statut_label?: string
  observation?: string; fibre_a?: FibreLabel | null; fibre_b?: FibreLabel | null
  message?: string; noeud_terminal?: NoeudTrace | null; cumul_db?: number | string
}
export interface ResultatTrace {
  fibre_depart: { id: string; label: string }
  chemin: EtapeTrace[]
  extremite_depart: NoeudTrace | null
  extremite_arrivee: NoeudTrace | null
  continu: boolean; cassure: boolean; resume: string
}

interface FibreCliquee {
  fibre_id: string
  soudure_id?: string | null
  etat?: string | null
}

export function useTracage() {
  const afficherTrace = ref(false)
  const chargementTrace = ref(false)
  const resultatTrace = ref<ResultatTrace | null>(null)
  const erreurTrace = ref<string | null>(null)

  const fermerTrace = () => {
    afficherTrace.value = false
    resultatTrace.value = null
    erreurTrace.value = null
  }

  const tracerBrin = async (fibre: FibreCliquee) => {
    // Règle métier : traçable si soudée OU brassée à l'ODF (UTILISE). Sinon refus.
    const estSoudee = !!fibre.soudure_id
    const estALodf = !estSoudee && fibre.etat === 'UTILISE'
    if (!estSoudee && !estALodf) {
      alert("Cette fibre n'est pas soudée. Soudez-la d'abord pour pouvoir tracer son chemin.")
      return
    }

    try {
      chargementTrace.value = true
      afficherTrace.value = true
      erreurTrace.value = null
      resultatTrace.value = null

      const response = await AuthService.apiCall(`${BASE_URL}/api/fibres/${fibre.fibre_id}/tracer/`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || err.erreur || `Erreur ${response.status}`)
      }
      resultatTrace.value = await response.json()
    } catch (e: unknown) {
      console.error('❌ Échec traçage:', e)
      erreurTrace.value = e instanceof Error ? e.message : String(e)
    } finally {
      chargementTrace.value = false
    }
  }

  // Édition inline de l'observation d'une soudure (la "zone texte" du technicien)
  const sauvegarderObservation = async (soudureId: string, observation: string) => {
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/soudures/${soudureId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations: observation })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || err.observations || `Erreur ${response.status}`)
      }
      // Reflète le changement localement sans re-tracer
      if (resultatTrace.value) {
        const etape = resultatTrace.value.chemin.find(e => e.soudure_id === soudureId)
        if (etape) etape.observation = observation
      }
      return true
    } catch (e: unknown) {
      console.error('❌ Échec sauvegarde observation:', e)
      alert(`Impossible de sauvegarder : ${e instanceof Error ? e.message : String(e)}`)
      return false
    }
  }

  return {
    afficherTrace, chargementTrace, resultatTrace, erreurTrace,
    tracerBrin, fermerTrace, sauvegarderObservation,
  }
}