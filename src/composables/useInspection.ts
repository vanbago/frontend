import { ref, reactive } from 'vue'
import AuthService from '../services/auth'
import type { ContenuMatrice, CableMatrice, FibreMatrice } from '../types/map'

const BASE_URL = AuthService.getBaseURL()

export function useInspection() {
  // — État matrice —
  const afficherMatrice = ref(false)
  const manchonEnMatrice = ref<ContenuMatrice | null>(null)
  const manchonNomEnMatrice = ref<string | null>(null)
  const manchonIdEnMatrice = ref<string | null>(null)
  const chargementMatrice = ref(false)
  const manchonEstEnAttente = ref(false)

  // — Filtres —
  const filtreCableSource = ref('')
  const filtreEtat = ref('')

  // — Mode soudure (clic-clic) —
  const modeSoudure = reactive({
    actif: false,
    cableSource: null as CableMatrice | null,
    fibreSource: null as FibreMatrice | null
  })

  // — Matrice —
  const fermerMatrice = () => {
    afficherMatrice.value = false
    manchonEnMatrice.value = null
    manchonNomEnMatrice.value = null
    manchonIdEnMatrice.value = null
    manchonEstEnAttente.value = false
    modeSoudure.actif = false
    modeSoudure.cableSource = null
    modeSoudure.fibreSource = null
  }

  const voirSoudures = async (manchonId: string, manchonNom?: string, enAttente?: boolean) => {
    try {
      chargementMatrice.value = true
      afficherMatrice.value = true
      manchonIdEnMatrice.value = manchonId
      manchonNomEnMatrice.value = manchonNom ?? manchonId
      const response = await AuthService.apiCall(`${BASE_URL}/api/manchons/${manchonId}/matrice/`)
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      const data: ContenuMatrice = await response.json()
      manchonEstEnAttente.value = enAttente ?? data.cables.length === 0
      manchonEnMatrice.value = data
    } catch (erreur) {
      console.error('❌ Échec chargement matrice soudures:', erreur)
      alert('Impossible de charger la matrice de soudures')
      fermerMatrice()
    } finally {
      chargementMatrice.value = false
    }
  }

  // Pour MANCHON_ENTERRE / MANCHON_AERIEN — l'endpoint est sur le nœud directement
  const voirSouduresNoeud = async (noeudId: string, noeudNom?: string) => {
    try {
      chargementMatrice.value = true
      afficherMatrice.value = true
      manchonIdEnMatrice.value = noeudId
      manchonNomEnMatrice.value = noeudNom ?? noeudId
      const response = await AuthService.apiCall(`${BASE_URL}/api/noeuds/${noeudId}/matrice/`)
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      manchonEnMatrice.value = await response.json()
    } catch (erreur) {
      console.error('❌ Échec chargement matrice nœud:', erreur)
      alert('Impossible de charger la matrice de soudures')
      fermerMatrice()
    } finally {
      chargementMatrice.value = false
    }
  }

  // — Filtrage —
  const filtrerFibres = (cable: CableMatrice) => {
    let fibres = cable.fibres
    if (filtreCableSource.value && cable.cable_id !== filtreCableSource.value) return []
    if (filtreEtat.value === 'soudees') fibres = fibres.filter(f => f.soudure_id)
    else if (filtreEtat.value === 'libres') fibres = fibres.filter(f => !f.soudure_id)
    return fibres
  }

  // — Soudure clic-clic —
  const annulerSoudure = () => {
    modeSoudure.actif = false
    modeSoudure.cableSource = null
    modeSoudure.fibreSource = null
  }

  const creerSoudure = async (fibreEntranteId: string, fibreSortanteId: string) => {
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/soudures/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fibre_entrante_id: fibreEntranteId, fibre_sortante_id: fibreSortanteId, statut: 'CONTINU' })
      })
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      annulerSoudure()
      if (manchonIdEnMatrice.value) await voirSoudures(manchonIdEnMatrice.value, manchonNomEnMatrice.value ?? undefined)
    } catch (erreur) {
      console.error('❌ Échec création soudure:', erreur)
      alert('Impossible de créer la soudure')
    }
  }

  const selectionnerFibre = (cable: CableMatrice, fibre: FibreMatrice) => {
    if (!modeSoudure.actif) {
      modeSoudure.actif = true
      modeSoudure.cableSource = cable
      modeSoudure.fibreSource = fibre
      return
    }
    if (modeSoudure.fibreSource && fibre.fibre_id !== modeSoudure.fibreSource.fibre_id) {
      creerSoudure(modeSoudure.fibreSource.fibre_id, fibre.fibre_id)
    }
  }

  const supprimerSoudure = async (soudureId: string) => {
    if (!confirm('Supprimer cette soudure ?')) return
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/soudures/${soudureId}/`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      if (manchonIdEnMatrice.value) await voirSoudures(manchonIdEnMatrice.value, manchonNomEnMatrice.value ?? undefined)
    } catch (erreur) {
      console.error('❌ Échec suppression soudure:', erreur)
      alert('Impossible de supprimer la soudure')
    }
  }

  const souderTout1a1 = async () => {
    if (!confirm('Souder toutes les fibres 1:1 ? (F1↔F1, F2↔F2, etc.)')) return
    alert('Fonctionnalité à implémenter : soudure batch 1:1')
  }

  const dessouderTout = async () => {
    if (!confirm('Supprimer TOUTES les soudures de ce manchon ?')) return
    alert('Fonctionnalité à implémenter : suppression batch')
  }

  return {
    afficherMatrice, manchonEnMatrice, manchonNomEnMatrice, manchonIdEnMatrice, chargementMatrice,
    manchonEstEnAttente,
    filtreCableSource, filtreEtat, modeSoudure,
    voirSoudures, voirSouduresNoeud, fermerMatrice,
    filtrerFibres, selectionnerFibre, annulerSoudure,
    supprimerSoudure, souderTout1a1, dessouderTout,
  }
}
