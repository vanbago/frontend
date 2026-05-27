import { ref, computed, reactive } from 'vue'
import AuthService from '../services/auth'

const BASE_URL = AuthService.getBaseURL()

type EtapeInsertion = 'idle' | 'attend_point' | 'formulaire' | 'envoi' | 'resultat'

export interface FormulaireNoeudInsertion {
  nom_noeud: string
  type_noeud: 'MANCHON' | 'MANCHON_ENTERRE' | 'MANCHON_AERIEN' | 'CHAMBRE' | 'POTEAU'
  creer_boitier: boolean
}

interface CableCible {
  id: string
  nom: string
}

interface ResultatInsertion {
  noeud_insere_id: string
  noeud_insere_nom: string
  message: string
}

export function useInsertionNoeud() {
  const etape = ref<EtapeInsertion>('idle')
  const cableCible = ref<CableCible | null>(null)
  const pointChoisi = ref<{ lat: number; lng: number } | null>(null)
  const resultat = ref<ResultatInsertion | null>(null)
  const erreur = ref<string | null>(null)

  const formulaire = reactive<FormulaireNoeudInsertion>({
    nom_noeud: '',
    type_noeud: 'MANCHON_ENTERRE',
    creer_boitier: true,
  })

  // Vrai quand l'UI doit intercepter les clics sur la carte
  const actif = computed(() => etape.value === 'attend_point')

  const demarrer = (cableId: string, cableNom: string) => {
    cableCible.value = { id: cableId, nom: cableNom }
    pointChoisi.value = null
    resultat.value = null
    erreur.value = null
    formulaire.nom_noeud = ''
    formulaire.type_noeud = 'MANCHON_ENTERRE'
    formulaire.creer_boitier = true
    etape.value = 'attend_point'
  }

  const annuler = () => {
    etape.value = 'idle'
    cableCible.value = null
    pointChoisi.value = null
    resultat.value = null
    erreur.value = null
  }

  const capturerPoint = (lat: number, lng: number) => {
    if (etape.value !== 'attend_point') return
    pointChoisi.value = { lat, lng }
    etape.value = 'formulaire'
  }

  const soumettre = async () => {
    if (!cableCible.value || !pointChoisi.value) return
    if (!formulaire.nom_noeud.trim()) {
      erreur.value = 'Le nom du nœud est obligatoire.'
      return
    }

    etape.value = 'envoi'
    erreur.value = null

    try {
      const response = await AuthService.apiCall(
        `${BASE_URL}/api/cables/${cableCible.value.id}/couper_cable_et_inserer_noeud/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: pointChoisi.value.lat,
            longitude: pointChoisi.value.lng,
            nom_noeud: formulaire.nom_noeud.trim(),
            type_noeud: formulaire.type_noeud,
            creer_boitier: formulaire.creer_boitier,
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        erreur.value = data.erreur || data.detail || `Erreur ${response.status}`
        etape.value = 'formulaire'  // retour au formulaire pour correction
        return
      }

      resultat.value = await response.json()
      etape.value = 'resultat'
    } catch (e) {
      erreur.value = e instanceof Error ? e.message : 'Erreur réseau'
      etape.value = 'formulaire'
    }
  }

  const fermerResultat = () => annuler()

  return {
    etape, actif, cableCible, pointChoisi, formulaire, resultat, erreur,
    demarrer, annuler, capturerPoint, soumettre, fermerResultat,
  }
}