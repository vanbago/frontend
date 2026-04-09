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

  /**
   * Charge toutes les pages d'un endpoint paginé DRF et retourne
   * un GeoJSON FeatureCollection fusionné avec toutes les features.
   */
  const chargerToutesLesPages = async (urlDepart: string): Promise<any[]> => {
    const toutesLesFeatures: any[] = []
    let urlCourante: string | null = urlDepart

    while (urlCourante) {
      const reponse = await AuthService.apiCall(urlCourante)
      if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`)

      const data = await reponse.json()

      // Cas paginé : { count, next, previous, results: FeatureCollection }
      if (data.results?.type === 'FeatureCollection') {
        toutesLesFeatures.push(...data.results.features)
        urlCourante = data.next ?? null
      // Cas paginé : { count, next, previous, results: Feature[] }
      } else if (Array.isArray(data.results)) {
        toutesLesFeatures.push(...data.results)
        urlCourante = data.next ?? null
      // Cas non paginé : FeatureCollection directe
      } else if (data.type === 'FeatureCollection') {
        toutesLesFeatures.push(...data.features)
        urlCourante = null
      } else {
        break
      }
    }

    return toutesLesFeatures
  }

  const chargerCables = async () => {
    try {
      chargementCables.value = true
      erreurCables.value = null

      const features = await chargerToutesLesPages(`${BASE_URL}/api/cables/`)

      geoJsonCables.value = { type: 'FeatureCollection', features }
      cables.value = features.map((f: any) => ({ id: f.id, ...f.properties }))

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

      const features = await chargerToutesLesPages(`${BASE_URL}/api/noeuds/`)

      geoJsonNoeuds.value = { type: 'FeatureCollection', features }
      noeuds.value = features.map((f: any) => ({ id: f.id, ...f.properties }))

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
