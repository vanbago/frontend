import { ref, computed, reactive } from 'vue'
import type { ShallowRef } from 'vue'
import L from 'leaflet'
import AuthService from '../services/auth'
import type { NoeudCentreInspection } from '../types/map'

const BASE_URL = AuthService.getBaseURL()

// =====================================================
// UTILITAIRES (exportés pour les composants)
// =====================================================

export const styleParType = (type: string): { fillColor: string; radius: number; icone: string; couleurTexte: string } => {
  switch (type) {
    case 'CENTRE':          return { fillColor: '#ef4444', radius: 14, icone: '🏢', couleurTexte: 'text-red-600' }
    case 'CHAMBRE':         return { fillColor: '#3b82f6', radius: 10, icone: '⬛', couleurTexte: 'text-blue-600' }
    case 'MANCHON':         return { fillColor: '#f59e0b', radius: 8,  icone: '🔶', couleurTexte: 'text-amber-600' }
    case 'MANCHON_ENTERRE': return { fillColor: '#78716c', radius: 8,  icone: '🔽', couleurTexte: 'text-stone-600' }
    case 'MANCHON_AERIEN':  return { fillColor: '#a78bfa', radius: 8,  icone: '🔼', couleurTexte: 'text-violet-600' }
    case 'POTEAU':          return { fillColor: '#84cc16', radius: 7,  icone: '🪵', couleurTexte: 'text-lime-600' }
    case 'BTS':             return { fillColor: '#06b6d4', radius: 11, icone: '📡', couleurTexte: 'text-cyan-600' }
    case 'CLIENT':          return { fillColor: '#ec4899', radius: 9,  icone: '🏠', couleurTexte: 'text-pink-600' }
    default:                return { fillColor: '#6b7280', radius: 8,  icone: '🖧',  couleurTexte: 'text-gray-600' }
  }
}

// =====================================================
// COMPOSABLE
// =====================================================

export function useNoeuds(map: ShallowRef<L.Map | null>) {
  let calqueNoeuds: L.GeoJSON | null = null

  // — Inspection nœud —
  const afficherInspectionNoeud = ref(false)
  const noeudEnInspection = ref<NoeudCentreInspection | null>(null)
  const chargementInspectionNoeud = ref(false)

  // popup pour manchon
  const popupAjouterManchonVisible = ref(false)
  const noeudPourManchon = ref<{ id: string, nom: string } | null>(null)
  const chargementAjoutManchon = ref(false)
  const cablesDisponiblesPourManchon = ref<any[]>([])



  // — Formulaire nœud —
  const panneauOuvert = ref(false)
  const centresDisponibles = ref<{ id: string, nom: string }[]>([])

  const formulaireNoeud = reactive({
    nom_code: '',
    type_noeud: 'MANCHON',
    latitude: '',
    longitude: '',
    statut_operationnel: 'EN SERVICE',
    statut_energie: 'PASSIF',
    est_frontiere: false,
    centre_partenaire_id: ''
  })



  // — Computed —
  const cablesTransitUniques = computed(() => {
    const cables = noeudEnInspection.value?.contenu?.cables ?? []
    const vus = new Set<string>()
    return cables.filter(c => {
      if (vus.has(c.id)) return false
      vus.add(c.id)
      return true
    })
  })

  // — Inspection —
  const fermerInspectionNoeud = () => {
    afficherInspectionNoeud.value = false
    noeudEnInspection.value = null
  }

  const inspecterNoeud = async (noeudId: string) => {
    try {
      chargementInspectionNoeud.value = true
      afficherInspectionNoeud.value = true
      const response = await AuthService.apiCall(`${BASE_URL}/api/noeuds/${noeudId}/inspecter/`)
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      noeudEnInspection.value = await response.json()
    } catch (erreur) {
      console.error("❌ Échec inspection nœud:", erreur)
      alert("Impossible de charger les détails du nœud")
      fermerInspectionNoeud()
    } finally {
      chargementInspectionNoeud.value = false
    }
  }

  // ouvrir popup pour ajouter manchon
  const ouvrirPopupAjouterManchon = async (noeudId: string, noeudNom: string, cables: any[]) => {
  noeudPourManchon.value = { id: noeudId, nom: noeudNom }
  // On utilise les câbles déjà chargés par l'inspection — pas de nouvel appel API
  cablesDisponiblesPourManchon.value = cables
  popupAjouterManchonVisible.value = true
}

const fermerPopupAjouterManchon = () => {
  popupAjouterManchonVisible.value = false
  noeudPourManchon.value = null
  cablesDisponiblesPourManchon.value = []
}

  // — Dessin —
  const dessinerNoeuds = (donneesGeoJson: any) => {
    const carte = map.value
    if (!carte || !donneesGeoJson) return
    if (calqueNoeuds) carte.removeLayer(calqueNoeuds)

    calqueNoeuds = L.geoJSON(donneesGeoJson, {
      pointToLayer: (feature, latlng) => {
        const type  = feature.properties?.type_noeud || ''
        const style = styleParType(type)

        if (type === 'BTS') {
          const couleur = '#22d3ee'
          const svg = `
            <svg viewBox="0 0 28 38" width="28" height="38" xmlns="http://www.w3.org/2000/svg">
              <!-- Signal arcs -->
              <path d="M7 10 Q14 4 21 10" fill="none" stroke="${couleur}" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>
              <path d="M10 13 Q14 9 18 13" fill="none" stroke="${couleur}" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
              <!-- Mât -->
              <line x1="14" y1="6" x2="14" y2="16" stroke="${couleur}" stroke-width="2.5" stroke-linecap="round"/>
              <!-- Corps de la tour (triangle) -->
              <path d="M14,16 L6,34 L22,34 Z" fill="${couleur}" fill-opacity="0.15" stroke="${couleur}" stroke-width="1.5" stroke-linejoin="round"/>
              <!-- Traverses -->
              <line x1="9"  y1="22" x2="19" y2="22" stroke="${couleur}" stroke-width="1.5"/>
              <line x1="7.5" y1="29" x2="20.5" y2="29" stroke="${couleur}" stroke-width="1.5"/>
              <!-- Base -->
              <line x1="5" y1="34" x2="23" y2="34" stroke="${couleur}" stroke-width="2.5" stroke-linecap="round"/>
            </svg>`
          return L.marker(latlng, {
            icon: L.divIcon({
              html: svg,
              className: '',
              iconSize:   [28, 38],
              iconAnchor: [14, 38],
              popupAnchor:[0, -38],
            })
          })
        }

        return L.circleMarker(latlng, {
          color: '#ffffff', weight: 2,
          fillColor: style.fillColor, fillOpacity: 1, radius: style.radius
        })
      },
      onEachFeature: (feature, layer) => {
        const infos = feature.properties || {}
        const noeudId = feature.id || infos.id || infos.url?.split('/').filter(Boolean).pop()
        const style = styleParType(infos.type_noeud || '')

        const popupContent = document.createElement('div')
        popupContent.className = 'text-gray-900 font-sans min-w-[180px]'
        popupContent.innerHTML = `
          <div class="flex items-center gap-2 mb-1">
            <span class="text-lg">${style.icone}</span>
            <b class="${style.couleurTexte} text-base">${infos.nom_code || 'Nœud Inconnu'}</b>
          </div>
          <hr class="my-1 border-gray-300">
          <p class="text-xs m-0"><b>Type:</b> ${infos.type_noeud_label || infos.type_noeud || 'N/A'}</p>
          <p class="text-xs m-0"><b>Énergie:</b> ${infos.statut_energie || 'N/A'}</p>
          <p class="text-xs m-0"><b>État:</b> ${infos.statut_operationnel || 'N/A'}</p>
        `
        const btn = document.createElement('button')
        btn.className = 'mt-2 w-full bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors'
        btn.textContent = '🔍 Inspecter'
        btn.onclick = () => {
          if (noeudId) { map.value?.closePopup(); inspecterNoeud(noeudId) }
          else alert("ID du nœud introuvable")
        }
        popupContent.appendChild(btn)
        layer.bindPopup(popupContent)
      }
    }).addTo(carte)

    calqueNoeuds.bringToFront()
  }


  const supprimerManchon = async (manchonId: string, manchonNom: string, onSuccess: () => void) => {
    if (!confirm(`Supprimer le manchon "${manchonNom}" ?\n\nCette action est irréversible.`)) return
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/boitiers/${manchonId}/`, { method: 'DELETE' })
      if (response.status === 204) {
        alert(`Manchon "${manchonNom}" supprimé.`)
        const noeudId = noeudEnInspection.value?.id
        if (noeudId) await inspecterNoeud(noeudId)
        onSuccess()
        return
      }
      const data = await response.json()
      alert(`Impossible de supprimer :\n\n${data.detail || `Erreur ${response.status}`}`)
    } catch (erreur: any) {
      console.error('Suppression manchon:', erreur)
      alert(`Erreur réseau : ${erreur.message}`)
    }
  }

  const creerManchon = async (
  payload: { nom_reference: string; nombre_cassettes: number | null; cables_ids: string[] },
  onSuccess: () => void
) => {
  if (!noeudPourManchon.value) return

  try {
    chargementAjoutManchon.value = true

    const response = await AuthService.apiCall(
      `${BASE_URL}/api/noeuds/${noeudPourManchon.value.id}/ajouter_manchon/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const erreur = await response.json()
      throw new Error(erreur.detail || erreur.erreur || `Erreur ${response.status}`)
    }

    const data = await response.json()
    alert(data.message)
    fermerPopupAjouterManchon()

    // Rafraîchir l'inspection du nœud pour voir le nouveau manchon
    const noeudId = noeudPourManchon.value?.id
    if (noeudId) {
      await inspecterNoeud(noeudId)
    }

    onSuccess()

  } catch (erreur: any) {
    console.error('❌ Échec création manchon:', erreur)
    alert(`Erreur : ${erreur.message}`)
  } finally {
    chargementAjoutManchon.value = false
  }
}

  // — Centres —
  const chargerCentres = async () => {
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/centres/`)
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      const data = await response.json()
      let liste: any[] = []
      if (data.results?.features)   liste = data.results.features
      else if (data.features)        liste = data.features
      else if (Array.isArray(data.results)) liste = data.results
      else if (Array.isArray(data))  liste = data

      centresDisponibles.value = liste.map((c: any) => ({
        id:  c.id ?? c.properties?.id,
        nom: c.properties?.nom_centre || c.properties?.nom || c.nom_centre || c.nom || 'Centre sans nom'
      }))
    } catch (erreur) {
      console.error("❌ Échec chargement centres:", erreur)
    }
  }

  // — Panneau nœud —
  const noeudEnEditionId = ref<string | null>(null)

  const ouvrirPanneau = () => {
    noeudEnEditionId.value = null
    panneauOuvert.value = true
  }

  const fermerPanneau = () => {
    panneauOuvert.value = false
    noeudEnEditionId.value = null
    formulaireNoeud.nom_code = ''
    formulaireNoeud.type_noeud = 'MANCHON'
    formulaireNoeud.latitude = ''
    formulaireNoeud.longitude = ''
    formulaireNoeud.statut_operationnel = 'EN SERVICE'
    formulaireNoeud.statut_energie = 'PASSIF'
    formulaireNoeud.est_frontiere = false
    formulaireNoeud.centre_partenaire_id = ''
  }

  const ouvrirEditionNoeud = async (noeudId: string) => {
    try {
      noeudEnEditionId.value = noeudId
      const rep = await AuthService.apiCall(`${BASE_URL}/api/noeuds/${noeudId}/`)
      if (!rep.ok) throw new Error(`Erreur ${rep.status}`)
      const data = await rep.json()
      // DRF GeoJSON : { type: Feature, geometry, properties } ou objet plat
      const props = data.properties ?? data
      const coords = data.geometry?.coordinates // [lng, lat]
      formulaireNoeud.nom_code            = props.nom_code ?? ''
      formulaireNoeud.type_noeud          = props.type_noeud ?? 'MANCHON'
      formulaireNoeud.statut_operationnel = props.statut_operationnel ?? 'EN SERVICE'
      formulaireNoeud.statut_energie      = props.statut_energie ?? 'PASSIF'
      formulaireNoeud.est_frontiere       = props.est_frontiere ?? false
      formulaireNoeud.centre_partenaire_id = props.centre_partenaire_id ?? ''
      formulaireNoeud.latitude            = coords ? String(coords[1]) : ''
      formulaireNoeud.longitude           = coords ? String(coords[0]) : ''
      panneauOuvert.value = true
    } catch (erreur) {
      console.error('❌ Échec chargement nœud pour édition:', erreur)
      alert('Impossible de charger les données du nœud.')
      noeudEnEditionId.value = null
    }
  }

  const supprimerNoeud = async (noeudId: string, nomNoeud: string, onSuccess: () => void) => {
    if (!confirm(`Supprimer définitivement le nœud « ${nomNoeud} » ?\nCette action est irréversible.`)) return
    try {
      const response = await AuthService.apiCall(`${BASE_URL}/api/noeuds/${noeudId}/`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      fermerInspectionNoeud()
      onSuccess()
    } catch (erreur) {
      console.error('❌ Échec suppression nœud:', erreur)
      alert('Impossible de supprimer le nœud. Vérifiez la console F12.')
    }
  }

  const sauvegarderNouveauNoeud = async (onSuccess: () => void) => {
    try {
      const lat = parseFloat(formulaireNoeud.latitude)
      const lng = parseFloat(formulaireNoeud.longitude)

      const payload: Record<string, any> = {
        nom_code:            formulaireNoeud.nom_code,
        type_noeud:          formulaireNoeud.type_noeud,
        statut_operationnel: formulaireNoeud.statut_operationnel,
        statut_energie:      formulaireNoeud.statut_energie,
        est_frontiere:       formulaireNoeud.est_frontiere,
        geometrie:           { type: "Point", coordinates: [lng, lat] }
      }
      if (formulaireNoeud.est_frontiere && formulaireNoeud.centre_partenaire_id) {
        payload.centre_partenaire_id = formulaireNoeud.centre_partenaire_id
      }

      const estEdition = !!noeudEnEditionId.value
      const url = estEdition
        ? `${BASE_URL}/api/noeuds/${noeudEnEditionId.value}/`
        : `${BASE_URL}/api/noeuds/`

      const reponse = await AuthService.apiCall(url, {
        method: estEdition ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!reponse.ok) {
        const err = await reponse.json()
        console.error("Détails du refus :", err)
        throw new Error(`Refus du serveur: ${reponse.status}`)
      }

      alert(estEdition
        ? `Le nœud ${formulaireNoeud.nom_code} a été mis à jour !`
        : `L'équipement ${formulaireNoeud.nom_code} a été ancré sur le réseau !`)
      fermerPanneau()

      if (!estEdition && map.value && !isNaN(lat) && !isNaN(lng)) {
        const marqueur = L.circleMarker([lat, lng], {
          color: '#ffffff', weight: 3, fillColor: '#f59e0b', fillOpacity: 1, radius: 10
        }).addTo(map.value)
        marqueur.bindPopup(`
          <div class="text-gray-900 font-sans min-w-[150px]">
            <b class="text-emerald-700 text-lg flex items-center gap-2">🖧 ${formulaireNoeud.nom_code}</b>
            <hr class="my-1 border-gray-300">
            <p class="text-sm m-0"><b>Type :</b> ${formulaireNoeud.type_noeud}</p>
          </div>
        `).openPopup()
        marqueur.bringToFront()
        map.value.setView([lat, lng], 17, { animate: true })
      }

      onSuccess()
    } catch (erreur) {
      console.error("❌ Échec sauvegarde nœud:", erreur)
      alert("Erreur lors de la sauvegarde du nœud. Vérifiez la console F12.")
    }
  }

  return {
    // état inspection
    afficherInspectionNoeud, noeudEnInspection, chargementInspectionNoeud,
    // état formulaire
    panneauOuvert, centresDisponibles, formulaireNoeud,
    // computed
    cablesTransitUniques,
    // fonctions
    dessinerNoeuds, inspecterNoeud, fermerInspectionNoeud,
    chargerCentres,
    noeudEnEditionId,
    ouvrirPanneau, ouvrirEditionNoeud, fermerPanneau, sauvegarderNouveauNoeud, supprimerNoeud,
    popupAjouterManchonVisible, noeudPourManchon,
    cablesDisponiblesPourManchon, chargementAjoutManchon,
    ouvrirPopupAjouterManchon, fermerPopupAjouterManchon, creerManchon, supprimerManchon,
  }
}
