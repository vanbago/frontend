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
        const style = styleParType(feature.properties?.type_noeud || '')
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
      throw new Error(erreur.erreur || `Erreur ${response.status}`)
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
  const ouvrirPanneau = () => { panneauOuvert.value = true }

  const fermerPanneau = () => {
    panneauOuvert.value = false
    formulaireNoeud.nom_code = ''
    formulaireNoeud.latitude = ''
    formulaireNoeud.longitude = ''
    formulaireNoeud.est_frontiere = false
    formulaireNoeud.centre_partenaire_id = ''
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

      const reponse = await AuthService.apiCall(`${BASE_URL}/api/noeuds/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!reponse.ok) {
        const err = await reponse.json()
        console.error("Détails du refus :", err)
        throw new Error(`Refus du serveur: ${reponse.status}`)
      }

      alert(`L'équipement ${formulaireNoeud.nom_code} a été ancré sur le réseau !`)
      fermerPanneau()

      if (map.value && !isNaN(lat) && !isNaN(lng)) {
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
      alert("Erreur lors de la création du nœud. Vérifiez la console F12.")
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
    ouvrirPanneau, fermerPanneau, sauvegarderNouveauNoeud,
    popupAjouterManchonVisible, noeudPourManchon,
    cablesDisponiblesPourManchon, chargementAjoutManchon,
    ouvrirPopupAjouterManchon, fermerPopupAjouterManchon, creerManchon,
  }
}
