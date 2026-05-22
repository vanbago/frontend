import { ref, reactive } from 'vue'
import AuthService from '../services/auth'
import type { OdfDetail, Fibre } from '../types/map'

const BASE_URL = AuthService.getBaseURL()

export function useOdf() {

  // ── État ────────────────────────────────────────────
  const odfEnDetail        = ref<OdfDetail | null>(null)
  const afficherOdf        = ref(false)
  const chargementOdf         = ref(false)
  const panneauCreationOuvert = ref(false)
  const portPourPlacement     = ref<string | null>(null)
  const fibresLibres          = ref<Fibre[]>([])
  const chargementFibres      = ref(false)

  const formulaireOdf = reactive({
    nom_reference: '',
    lignes:        4,
    colonnes:      12,
    cable_id:      '',
    noeud_id:      '',
  })

  // ── Charger un ODF existant ─────────────────────────
  const chargerOdf = async (odfId: string) => {
    try {
      chargementOdf.value = true
      afficherOdf.value   = true
      const response = await AuthService.apiCall(`${BASE_URL}/api/odf/${odfId}/`)
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      odfEnDetail.value = await response.json()
    } catch (erreur) {
      console.error('❌ Échec chargement ODF:', erreur)
      alert('Impossible de charger l\'ODF.')
      fermerOdf()
    } finally {
      chargementOdf.value = false
    }
  }

  // ── Créer un ODF ────────────────────────────────────
  const creerOdf = async (onSuccess: () => void) => {
    if (!formulaireOdf.nom_reference.trim()) { alert('⚠️ Nom obligatoire'); return }
    if (!formulaireOdf.cable_id)             { alert('⚠️ Câble obligatoire'); return }
    if (!formulaireOdf.noeud_id)             { alert('⚠️ Nœud obligatoire'); return }

    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/odf/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nom_reference: formulaireOdf.nom_reference,
          lignes:        formulaireOdf.lignes,
          colonnes:      formulaireOdf.colonnes,
          cable_id:      formulaireOdf.cable_id,
          noeud_id:      formulaireOdf.noeud_id,
        }),
      })
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      const odf = await response.json()
      fermerPanneauCreation()
      onSuccess()
      await chargerOdf(odf.id)
    } catch (erreur) {
      console.error('❌ Échec création ODF:', erreur)
      alert('Impossible de créer l\'ODF.')
    }
  }

  // ── Picker de fibres ────────────────────────────────
  const ouvrirPickerFibre = async (portId: string) => {
    if (!odfEnDetail.value?.cable?.id) {
      alert('⚠️ Aucun câble associé à cet ODF.')
      return
    }
    portPourPlacement.value = portId
    chargementFibres.value  = true
    try {
      const response = await AuthService.apiCall(
        `${BASE_URL}/api/cables/${odfEnDetail.value.cable.id}/inspecter/`
      )
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      const data = await response.json()
      fibresLibres.value = (data.fibres as Fibre[]).filter(f => f.etat === 'LIBRE')
    } catch (erreur) {
      console.error('❌ Échec chargement fibres:', erreur)
      alert('Impossible de charger les fibres disponibles.')
      portPourPlacement.value = null
    } finally {
      chargementFibres.value = false
    }
  }

  const fermerPickerFibre = () => {
    portPourPlacement.value = null
    fibresLibres.value      = []
  }

  // ── Placer une fibre sur un port ────────────────────
  const placerFibre = async (portId: string, fibreId: string) => {
    if (!odfEnDetail.value) return
    try {
      const response = await AuthService.apiCall(
        `${BASE_URL}/api/odf/${odfEnDetail.value.id}/placer_fibre/`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ port_id: portId, fibre_id: fibreId }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.erreur || data.detail || `Erreur ${response.status}`)
      }
      fermerPickerFibre()
      await chargerOdf(odfEnDetail.value.id)
    } catch (erreur) {
      console.error('❌ Échec placement fibre:', erreur)
      alert(`Placement échoué : ${erreur instanceof Error ? erreur.message : String(erreur)}`)
    }
  }

  // ── Déplacer une fibre vers un autre port ───────────
  const deplacerFibre = async (portSourceId: string, portDestinationId: string) => {
    if (!odfEnDetail.value) return
    try {
      const response = await AuthService.apiCall(
        `${BASE_URL}/api/odf/${odfEnDetail.value.id}/deplacer_fibre/`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ port_source_id: portSourceId, port_destination_id: portDestinationId }),
        }
      )
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      await chargerOdf(odfEnDetail.value.id)
    } catch (erreur) {
      console.error('❌ Échec déplacement fibre:', erreur)
      alert('Impossible de déplacer la fibre.')
    }
  }

  // ── Retirer une fibre d'un port ─────────────────────
  const retirerFibre = async (portId: string) => {
    if (!odfEnDetail.value) return
    try {
      const response = await AuthService.apiCall(
        `${BASE_URL}/api/odf/${odfEnDetail.value.id}/retirer_fibre/`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ port_id: portId }),
        }
      )
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      await chargerOdf(odfEnDetail.value.id)
    } catch (erreur) {
      console.error('❌ Échec retrait fibre:', erreur)
      alert('Impossible de retirer la fibre.')
    }
  }

  // ── Helpers ─────────────────────────────────────────
  const fermerOdf = () => {
    afficherOdf.value  = false
    odfEnDetail.value  = null
  }

  const ouvrirPanneauCreation = (noeudId: string, cableId: string) => {
    formulaireOdf.noeud_id  = noeudId
    formulaireOdf.cable_id  = cableId
    formulaireOdf.nom_reference = ''
    formulaireOdf.lignes    = 4
    formulaireOdf.colonnes  = 12
    panneauCreationOuvert.value = true
  }

  const fermerPanneauCreation = () => {
    panneauCreationOuvert.value = false
  }

  return {
    odfEnDetail, afficherOdf, chargementOdf,
    panneauCreationOuvert, formulaireOdf,
    portPourPlacement, fibresLibres, chargementFibres,
    chargerOdf, creerOdf,
    placerFibre, deplacerFibre, retirerFibre,
    fermerOdf, ouvrirPanneauCreation, fermerPanneauCreation,
    ouvrirPickerFibre, fermerPickerFibre,
  }
}
