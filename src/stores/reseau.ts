// src/stores/reseau.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import AuthService from '../services/auth'

const BASE_URL = AuthService.getBaseURL()

// ============================================================
// INTERFACES TYPESCRIPT
// Partagées entre le store, MapView et InventaireView
// ============================================================

export interface Cable {
  id: string
  nom_code: string | null
  capacite_fibres: number | null
  longueur_reelle_metres: number | null
  technologie_transport: string | null
  statut_physique: string | null
  noeud_depart_nom?: string | null
  noeud_fin_nom?: string | null
}

export interface Noeud {
  id: string
  nom_code: string | null
  type_noeud: string
  type_noeud_label?: string
  statut_operationnel: string | null
  statut_energie: string | null
  date_modification: string | null
  geometrie?: any
}

// ============================================================
// LE STORE
// ============================================================

export const useReseauStore = defineStore('reseau', () => {

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const geoJsonCables = ref<any>(null)
  const geoJsonNoeuds = ref<any>(null)

  const cables = ref<Cable[]>([])
  const noeuds = ref<Noeud[]>([])

  const chargementCables = ref(false)
  const chargementNoeuds = ref(false)

  const erreurCables = ref<string | null>(null)
  const erreurNoeuds = ref<string | null>(null)

  // ----------------------------------------------------------
  // GETTERS
  // ----------------------------------------------------------

  const totalCables = computed(() => cables.value.length)
  const totalNoeuds = computed(() => noeuds.value.length)

  const noeudsByType = computed(() => {
    const groupes: Record<string, Noeud[]> = {}
    for (const noeud of noeuds.value) {
      const type = noeud.type_noeud || 'INCONNU'
      if (!groupes[type]) groupes[type] = []
      groupes[type].push(noeud)
    }
    return groupes
  })

  const capaciteTotale = computed(() =>
    cables.value.reduce((total, c) => total + (c.capacite_fibres || 0), 0)
  )

  // ----------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------

  const chargerCables = async () => {
    try {
      chargementCables.value = true
      erreurCables.value = null

      const reponse = await AuthService.apiCall(`${BASE_URL}/api/cables/`)
      if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`)

      const data = await reponse.json()

      if (data.results?.type === 'FeatureCollection') {
        geoJsonCables.value = data.results
        cables.value = data.results.features.map((f: any) => ({ id: f.id, ...f.properties }))
      } else if (data.type === 'FeatureCollection') {
        geoJsonCables.value = data
        cables.value = data.features.map((f: any) => ({ id: f.id, ...f.properties }))
      }

    } catch (e: any) {
      erreurCables.value = e.message
      console.error('❌ Erreur chargement câbles:', e)
    } finally {
      chargementCables.value = false
    }
  }

  const chargerNoeuds = async () => {
    try {
      chargementNoeuds.value = true
      erreurNoeuds.value = null

      const reponse = await AuthService.apiCall(`${BASE_URL}/api/noeuds/`)
      if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`)

      const data = await reponse.json()

      if (data.results?.type === 'FeatureCollection') {
        geoJsonNoeuds.value = data.results
        noeuds.value = data.results.features.map((f: any) => ({ id: f.id, ...f.properties }))
      } else if (data.type === 'FeatureCollection') {
        geoJsonNoeuds.value = data
        noeuds.value = data.features.map((f: any) => ({ id: f.id, ...f.properties }))
      }

    } catch (e: any) {
      erreurNoeuds.value = e.message
      console.error('❌ Erreur chargement nœuds:', e)
    } finally {
      chargementNoeuds.value = false
    }
  }

  const chargerInfrastructure = async () => {
    await Promise.all([chargerCables(), chargerNoeuds()])
  }

  const ajouterNoeudLocal = (noeud: Noeud) => {
    noeuds.value.push(noeud)
  }

  // ----------------------------------------------------------
  // EXPORT
  // ----------------------------------------------------------
  return {
    geoJsonCables, geoJsonNoeuds,
    cables, noeuds,
    chargementCables, chargementNoeuds,
    erreurCables, erreurNoeuds,
    totalCables, totalNoeuds, noeudsByType, capaciteTotale,
    chargerCables, chargerNoeuds, chargerInfrastructure, ajouterNoeudLocal,
  }
})
