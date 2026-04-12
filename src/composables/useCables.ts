import { ref, computed, reactive } from 'vue'
import type { ShallowRef } from 'vue'
import L from 'leaflet'
import AuthService from '../services/auth'
import type { CableInspection, Fibre, NormeCouleurs } from '../types/map'
import { useCableEdit } from './useCableEdit'

const BASE_URL = AuthService.getBaseURL()
const {activerEditionCable} = useCableEdit()



// =====================================================
// COULEURS FIBRES (ITU-T)
// =====================================================

export const COULEURS_FIBRES: Record<string, string> = {
  BLEU: '#1d4ed8', ORANGE: '#ea580c', VERT: '#16a34a', MARRON: '#92400e',
  ARDOISE: '#64748b', BLANC: '#f8fafc', ROUGE: '#dc2626', NOIR: '#171717',
  JAUNE: '#ca8a04', VIOLET: '#7c3aed', ROSE: '#db2777', CYAN: '#0891b2',
  INCONNUE: '#9ca3af',
}

export const DICTIONNAIRE_COULEURS: Record<string, { bg: string, border: string, isDashed?: boolean }> = {
  "INCONNUE":          { bg: '#9ca3af', border: '#6b7280' },
  "Bleu":              { bg: '#3b82f6', border: 'transparent' },
  "Orange":            { bg: '#f97316', border: 'transparent' },
  "Vert":              { bg: '#22c55e', border: 'transparent' },
  "Marron":            { bg: '#8b4513', border: 'transparent' },
  "Gris":              { bg: '#64748b', border: 'transparent' },
  "Blanc":             { bg: '#ffffff', border: '#cbd5e1' },
  "Rouge":             { bg: '#ef4444', border: 'transparent' },
  "Noir":              { bg: '#0f172a', border: 'transparent' },
  "Jaune":             { bg: '#eab308', border: 'transparent' },
  "Violet":            { bg: '#a855f7', border: 'transparent' },
  "Rose":              { bg: '#ec4899', border: 'transparent' },
  "Turquoise":         { bg: '#06b6d4', border: 'transparent' },
  "Bleu pointillé":    { bg: '#3b82f6', border: '#ffffff', isDashed: true },
  "Orange pointillé":  { bg: '#f97316', border: '#ffffff', isDashed: true },
  "Vert pointillé":    { bg: '#22c55e', border: '#ffffff', isDashed: true },
  "Marron pointillé":  { bg: '#8b4513', border: '#ffffff', isDashed: true },
}

export const CATALOGUE_NORMES: Record<string, string[]> = {
  "EIA-589":           ["Bleu", "Orange", "Vert", "Marron", "Gris", "Blanc", "Rouge", "Noir", "Jaune", "Violet", "Rose", "Turquoise"],
  "Câble 6 brins":     ["Bleu", "Orange", "Vert", "Marron", "Gris", "Blanc"],
  "IEC 60304":         ["Rouge", "Vert", "Bleu", "Jaune", "Blanc", "Gris", "Marron", "Violet", "Turquoise", "Noir", "Orange", "Rose"],
  "FOTAG":             ["Rouge", "Bleu", "Vert", "Jaune", "Violet", "Blanc", "Orange", "Gris", "Marron", "Noir", "Turquoise", "Rose"],
  "France":            ["Bleu", "Rouge", "Vert", "Jaune", "Violet", "Blanc"],
  "Eneo a 16 fibres":  ["Bleu", "Orange", "Vert", "Marron", "Gris", "Blanc", "Rouge", "Noir", "Jaune", "Violet", "Rose", "Turquoise", "Bleu pointillé", "Orange pointillé", "Vert pointillé", "Marron pointillé"],
}

// =====================================================
// COULEUR PAR CAPACITÉ (câbles sur la carte)
// =====================================================

export const PALETTE_CAPACITE: { max: number; couleur: string; label: string }[] = [
  { max: 6,   couleur: '#94a3b8', label: '≤ 6 FO' },
  { max: 12,  couleur: '#22d3ee', label: '≤ 12 FO' },
  { max: 24,  couleur: '#84cc16', label: '≤ 24 FO' },
  { max: 48,  couleur: '#f59e0b', label: '≤ 48 FO' },
  { max: 72,  couleur: '#f97316', label: '≤ 72 FO' },
  { max: 96,  couleur: '#ef4444', label: '≤ 96 FO' },
  { max: 144, couleur: '#dc2626', label: '≤ 144 FO' },
  { max: Infinity, couleur: '#a855f7', label: '> 144 FO' },
]

export const couleurParCapacite = (capacite: number | null | undefined): string => {
  if (!capacite) return PALETTE_CAPACITE[0].couleur
  return (PALETTE_CAPACITE.find(p => capacite <= p.max) ?? PALETTE_CAPACITE[PALETTE_CAPACITE.length - 1]).couleur
}

// =====================================================
// UTILITAIRES (exportés pour les composants)
// =====================================================

export const formaterLongueur = (longueurMetres: number | string | null | undefined): string => {
  if (longueurMetres === null || longueurMetres === undefined) return 'N/A'
  const valeur = Number(longueurMetres)
  if (isNaN(valeur)) return 'N/A'
  return valeur >= 1000 ? (valeur / 1000).toFixed(2) + ' km' : valeur.toFixed(0) + ' m'
}

export const getCouleurFibre = (numero: number, codeNorme: keyof typeof CATALOGUE_NORMES = "EIA-589") => {
  const sequence = CATALOGUE_NORMES[codeNorme] || CATALOGUE_NORMES["EIA-589"]
  const index = (numero - 1) % sequence.length
  return {
    nom: sequence[index],
    tube: Math.floor((numero - 1) / sequence.length) + 1,
    style: DICTIONNAIRE_COULEURS[sequence[index]] || DICTIONNAIRE_COULEURS["INCONNUE"]
  }
}

export const getStyleFibre = (fibre: Fibre, norme: NormeCouleurs | null) => {
  if (fibre.code_couleur_hex) {
    const style = DICTIONNAIRE_COULEURS[fibre.code_couleur_hex]
    if (style) return style
  }
  if (norme?.code) return getCouleurFibre(fibre.numero_fibre, norme.code).style
  return DICTIONNAIRE_COULEURS["INCONNUE"]
}

// =====================================================
// COMPOSABLE
// =====================================================

export function useCables(map: ShallowRef<L.Map | null>) {
  let calqueCables: L.GeoJSON | null = null

  // — Inspection câble —
  const afficherInspection = ref(false)
  const cableEnInspection = ref<CableInspection | null>(null)
  const chargementInspection = ref(false)

  // — Formulaire câble —
  const panneauCableOuvert = ref(false)
  const noeudsDisponibles = ref<{ id: string, nom: string, type: string, coords: [number, number] | null }[]>([])
  const normesDisponibles = ref<{ id: string, code: string }[]>([])
  const centreUtilisateurNom = ref<string | null>(null)
  const estSuperAdmin = ref(false)
  const centresDisponibles = ref<{ id: string, nom: string }[]>([])

  const formulaireCable = reactive({
    nom_code: '',
    noeud_depart_id: '',
    noeud_fin_id: '',
    capacite_fibres: 96,
    norme_id: '',
    technologie_transport: 'FO',
    longueur_reelle_metres: '',
    statut_physique: 'EN_SERVICE',
    centre_proprietaire_id: ''
  })

  const cableEnEditionId = ref<string | null>(null)

  // — Computed —
  const fibresParTube = computed(() => {
    const cable = cableEnInspection.value
    if (!cable) return {}

    const norme = cable.norme_details
    const capacite = cable.capacite_fibres || 0
    const fibresParTubeCount = norme?.sequence_couleurs?.length || 12
    const nombreTubes = Math.ceil(capacite / fibresParTubeCount)

    if (cable.fibres && cable.fibres.length > 0) {
      const groupes: Record<number, Fibre[]> = {}
      for (const fibre of cable.fibres) {
        if (!groupes[fibre.numero_tube]) groupes[fibre.numero_tube] = []
        groupes[fibre.numero_tube].push(fibre)
      }
      for (const tube in groupes) {
        groupes[tube].sort((a, b) => a.numero_fibre - b.numero_fibre)
      }
      return groupes
    }

    // Structure théorique (fallback)
    const groupes: Record<number, Fibre[]> = {}
    for (let t = 1; t <= nombreTubes; t++) {
      groupes[t] = []
      const debut = (t - 1) * fibresParTubeCount + 1
      const fin = Math.min(t * fibresParTubeCount, capacite)
      for (let f = debut; f <= fin; f++) {
        const indexCouleur = (f - 1) % fibresParTubeCount
        groupes[t].push({
          id: `temp-${t}-${f}`, url: '',
          numero_tube: t, numero_fibre: f,
          code_couleur_hex: norme?.sequence_couleurs?.[indexCouleur] || 'INCONNUE',
          etat: null
        })
      }
    }
    return groupes
  })

  const structureCable = computed(() => {
    const cable = cableEnInspection.value
    if (!cable) return ''
    const tubes = fibresParTube.value
    const nombreTubes = Object.keys(tubes).length
    if (nombreTubes > 0) {
      const max = Math.max(...Object.values(tubes).map(f => f.length))
      return `${nombreTubes}×${max}`
    }
    const capacite = cable.capacite_fibres || 0
    const fibresParTubeCount = cable.norme_details?.sequence_couleurs?.length || 12
    return `${Math.ceil(capacite / fibresParTubeCount)}×${fibresParTubeCount}`
  })

  // — Couleur tube —
  const getCouleurTube = (numeroTube: number) => {
    const norme = cableEnInspection.value?.norme_details
    const sequence = norme?.sequence_couleurs || CATALOGUE_NORMES["EIA-589"]
    const nomCouleur = sequence[(numeroTube - 1) % sequence.length]
    return { nom: nomCouleur, style: DICTIONNAIRE_COULEURS[nomCouleur] || DICTIONNAIRE_COULEURS["INCONNUE"] }
  }

  // — Inspection —
  const fermerInspection = () => {
    afficherInspection.value = false
    cableEnInspection.value = null
  }

  const inspecterCable = async (cableID: string) => {
    try {
      chargementInspection.value = true
      afficherInspection.value = true
      const response = await AuthService.apiCall(`${BASE_URL}/api/cables/${cableID}/inspecter/`)
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      cableEnInspection.value = await response.json()
    } catch (erreur) {
      console.error("❌ Échec inspection câble:", erreur)
      alert("Impossible de charger les details")
      fermerInspection()
    } finally {
      chargementInspection.value = false
    }
  }

  // — Dessin —
  const dessinerCables = (donneesGeoJson: any) => {
    const carte = map.value
    if (!carte) return
    if (calqueCables) carte.removeLayer(calqueCables)

    calqueCables = L.geoJSON(donneesGeoJson, {
      style: (feature) => ({
        color: couleurParCapacite(feature?.properties?.capacite_fibres),
        weight: 3,
        opacity: 0.9,
      }),
      onEachFeature: (feature, layer) => {
        const infos = feature.properties || {}
        const cableID = feature.id || infos.id || infos.url?.split('/').filter(Boolean).pop()

        const popupContent = document.createElement('div')
        popupContent.innerHTML = `
          <b class="text-blue-700 text-lg flex items-center gap-2">${infos.nom_code || 'Câble Inconnu'}</b>
          <hr class="my-1 border-gray-300">
          <p class="text-sm m-0"><b>Capacité :</b> ${infos.capacite_fibres || 'N/A'} fibres</p>
          <p class="text-sm m-0"><b>Longueur :</b> ${formaterLongueur(infos.longueur_reelle_metres)}</p>
        `
        const btn = document.createElement('button')
        btn.className = 'mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors'
        btn.textContent = 'Inspecter'
        btn.onclick = () => {
          if (cableID) { carte.closePopup(); inspecterCable(cableID) }
          else alert("ID du câble introuvable")
        }
        popupContent.appendChild(btn)
        layer.bindPopup(popupContent)

        const coul = couleurParCapacite(infos.capacite_fibres)
        layer.on('mouseover', () => (layer as L.Path).setStyle({ weight: 6, opacity: 1, color: coul }))
        layer.on('mouseout',  () => (layer as L.Path).setStyle({ weight: 3, opacity: 0.9, color: coul }))

        // Clic droit → édition du tracé
        layer.on('contextmenu', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stop(e)
          if (cableID) activerEditionCable(layer as L.Polyline, cableID, () => {})
        })
      }
    }).addTo(carte)
  }

  // — Chargement données formulaire —
  const chargerNoeuds = async () => {
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/noeuds/`)
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      const data = await response.json()
      let noeuds = data.results?.features || data.features || []
      noeudsDisponibles.value = noeuds.map((n: any) => ({
        id: n.id || n.properties?.id,
        nom: n.properties?.nom_code || 'Nœud sans nom',
        type: n.properties?.type_noeud || '',
        coords: n.geometry?.coordinates ?? null
      }))
    } catch (erreur) {
      console.error("❌ Échec chargement nœuds:", erreur)
    }
  }

  const chargerNormes = async () => {
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/normes/`)
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      const data = await response.json()
      const liste = data.results || data
      normesDisponibles.value = (Array.isArray(liste) ? liste : []).map((n: any) => ({ id: n.id, code: n.code }))
    } catch (erreur) {
      console.error("❌ Échec chargement normes:", erreur)
    }
  }

  const idDepuisUrl = (url: string | null) =>
    url ? url.split('/').filter(Boolean).pop() ?? '' : ''

  const chargerCentres = async () => {
    try {
      const rep = await AuthService.apiCall(`${BASE_URL}/api/centres/`)
      if (!rep.ok) return
      const data = await rep.json()
      let liste: any[] = []
      if (data.results?.features)        liste = data.results.features
      else if (data.features)            liste = data.features
      else if (Array.isArray(data.results)) liste = data.results
      else if (Array.isArray(data))      liste = data
      centresDisponibles.value = liste.map((c: any) => ({
        id:  c.id ?? c.properties?.id,
        nom: c.properties?.nom_centre || c.properties?.nom || c.nom_centre || c.nom || 'Centre sans nom'
      }))
    } catch { /* silencieux */ }
  }

  // — Panneau câble —
  const ouvrirPanneauCable = async () => {
    cableEnEditionId.value = null
    await Promise.all([chargerNoeuds(), chargerNormes()])
    const rep = await AuthService.apiCall(`${BASE_URL}/api/utilisateurs/me/`)
    if (rep.ok) {
      const moi = await rep.json()
      // Pas de centre assigné → dropdown (super admin ou admin sans centre)
      estSuperAdmin.value = !moi.centre_id
      if (estSuperAdmin.value) {
        await chargerCentres()
        centreUtilisateurNom.value = null
        formulaireCable.centre_proprietaire_id = ''
      } else {
        formulaireCable.centre_proprietaire_id = moi.centre_id ?? ''
        centreUtilisateurNom.value = moi.centre_nom ?? null
      }
    }
    panneauCableOuvert.value = true
  }

  const ouvrirEditionCable = async (cableID: string) => {
    cableEnEditionId.value = cableID
    await Promise.all([chargerNoeuds(), chargerNormes()])
    const cable = cableEnInspection.value
    if (cable) {
      formulaireCable.nom_code               = cable.nom_code
      formulaireCable.noeud_depart_id        = idDepuisUrl(cable.noeud_depart_url)
      formulaireCable.noeud_fin_id           = idDepuisUrl(cable.noeud_fin_url)
      formulaireCable.capacite_fibres        = cable.capacite_fibres
      formulaireCable.norme_id               = idDepuisUrl(cable.norme_details?.url ?? null)
      formulaireCable.technologie_transport  = cable.technologie_transport ?? 'FO'
      formulaireCable.longueur_reelle_metres = cable.longueur_reelle_metres?.toString() ?? ''
      formulaireCable.statut_physique        = cable.statut_physique ?? 'EN_SERVICE'
      formulaireCable.centre_proprietaire_id = idDepuisUrl(cable.centre_url)
    }
    panneauCableOuvert.value = true
  }

  const fermerPanneauCable = () => {
    panneauCableOuvert.value = false
    cableEnEditionId.value = null
    formulaireCable.nom_code = ''
    formulaireCable.noeud_depart_id = ''
    formulaireCable.noeud_fin_id = ''
    formulaireCable.capacite_fibres = 96
    formulaireCable.norme_id = ''
    formulaireCable.technologie_transport = 'FO'
    formulaireCable.longueur_reelle_metres = ''
    formulaireCable.statut_physique = 'EN_SERVICE'
    formulaireCable.centre_proprietaire_id = ''
  }

  const supprimerCable = async (cableID: string, nomCable: string, onSuccess: () => void) => {
    if (!confirm(`Supprimer définitivement le câble « ${nomCable} » ?\nCette action est irréversible.`)) return
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/cables/${cableID}/`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      fermerInspection()
      onSuccess()
    } catch (erreur) {
      console.error('❌ Échec suppression câble:', erreur)
      alert('Impossible de supprimer le câble. Vérifiez la console F12.')
    }
  }

  const sauvegarderNouveauCable = async (onSuccess: () => void) => {
    if (!formulaireCable.nom_code.trim())          { alert("⚠️ Veuillez saisir un nom pour le câble"); return }
    if (!formulaireCable.noeud_depart_id)           { alert("⚠️ Veuillez sélectionner un nœud de départ"); return }
    if (!formulaireCable.noeud_fin_id)              { alert("⚠️ Veuillez sélectionner un nœud de fin"); return }
    if (formulaireCable.noeud_depart_id === formulaireCable.noeud_fin_id) { alert("⚠️ Le nœud de départ et de fin doivent être différents"); return }
    if (!formulaireCable.norme_id)                  { alert("⚠️ Veuillez sélectionner une norme de couleurs"); return }
    if (!formulaireCable.centre_proprietaire_id)    { alert("⚠️ Veuillez sélectionner un centre propriétaire"); return }

    try {
      const noeudDepart = noeudsDisponibles.value.find(n => n.id === formulaireCable.noeud_depart_id)
      const noeudFin    = noeudsDisponibles.value.find(n => n.id === formulaireCable.noeud_fin_id)
      const geometrie = noeudDepart?.coords && noeudFin?.coords
        ? { type: 'LineString', coordinates: [noeudDepart.coords, noeudFin.coords] }
        : null

      const payload: Record<string, any> = {
        nom_code:               formulaireCable.nom_code,
        noeud_depart_id:        formulaireCable.noeud_depart_id,
        noeud_fin_id:           formulaireCable.noeud_fin_id,
        capacite_fibres:        formulaireCable.capacite_fibres,
        norme_id:               formulaireCable.norme_id,
        technologie_transport:  formulaireCable.technologie_transport,
        statut_physique:        formulaireCable.statut_physique,
        centre_proprietaire_id: formulaireCable.centre_proprietaire_id,
        longueur_reelle_metres: formulaireCable.longueur_reelle_metres
          ? parseFloat(formulaireCable.longueur_reelle_metres) : null
      }
      if (geometrie) payload.geometrie = geometrie

      const estEdition = !!cableEnEditionId.value
      const url = estEdition
        ? `${BASE_URL}/api/cables/${cableEnEditionId.value}/`
        : `${BASE_URL}/api/cables/`

      const response = await AuthService.apiCall(url, {
        method: estEdition ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error(JSON.stringify(await response.json()))

      alert(estEdition ? "Câble modifié avec succès !" : "Câble créé avec succès !")
      fermerPanneauCable()
      onSuccess()
    } catch (erreur) {
      console.error("❌ Échec sauvegarde câble:", erreur)
      alert("Erreur lors de la sauvegarde du câble. Vérifiez la console F12.")
    }
  }

  return {
    // état inspection
    afficherInspection, cableEnInspection, chargementInspection,
    // état formulaire
    panneauCableOuvert, noeudsDisponibles, normesDisponibles,
    centreUtilisateurNom, estSuperAdmin, centresDisponibles,
    formulaireCable, cableEnEditionId,
    // computed
    fibresParTube, structureCable,
    // fonctions
    dessinerCables, inspecterCable, fermerInspection, supprimerCable,
    getCouleurTube, getStyleFibre,
    ouvrirPanneauCable, ouvrirEditionCable, fermerPanneauCable, sauvegarderNouveauCable,
  }
}
