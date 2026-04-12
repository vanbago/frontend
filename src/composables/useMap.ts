import { shallowRef, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import AuthService from '../services/auth'

const BASE_URL = AuthService.getBaseURL()

export function useMap() {
  const map = shallowRef<L.Map | null>(null)
  const utilisateurNom = ref<string | null>(null)

  const initMap = async () => {
    // Charger le profil utilisateur
    const repMe = await AuthService.apiCall(`${BASE_URL}/api/utilisateurs/me/`)
    if (repMe.ok) {
      const moi = await repMe.json()
      const prenom = moi.first_name?.trim()
      const nom = moi.last_name?.trim()
      utilisateurNom.value = prenom || nom ? `${prenom} ${nom}`.trim() : moi.username
    }

    const centreCoordonnees: L.LatLngExpression = [3.8480, 11.5021]

    map.value = L.map('map', { center: centreCoordonnees, zoom: 13, zoomControl: true, editable: true } as any)

    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; OpenStreetMap contributors',
      maxZoom: 20
    }).addTo(map.value)

    L.circleMarker(centreCoordonnees, {
      color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.6, radius: 8
    }).addTo(map.value)
      .bindPopup('<b>Nœud Optique Principal</b><br>Yaoundé')

    map.value.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat.toFixed(6)
      const lng = e.latlng.lng.toFixed(6)
      L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div class="text-gray-900 text-center font-sans">
            <b class="text-blue-600">📍 Coordonnées GPS</b><br>
            <span class="text-xs text-gray-500">Lat :</span> ${lat}<br>
            <span class="text-xs text-gray-500">Lng :</span> ${lng}
          </div>
        `)
        .openOn(map.value!)
    })

    setTimeout(() => map.value?.invalidateSize(), 200)
  }

  const dessinerFrontiere = async () => {
    const carte = map.value
    if (!carte) return
    try {
      const url = "https://nominatim.openstreetmap.org/search?q=Nyong-et-So'o,+Cameroon&format=json&polygon_geojson=1&limit=1"
      const reponse = await fetch(url)
      const data = await reponse.json()
      if (data?.length > 0 && data[0].geojson) {
        const calque = L.geoJSON(data[0].geojson, {
          style: { color: '#8b5cf6', weight: 2, dashArray: '5, 10', fillColor: '#8b5cf6', fillOpacity: 0.1 }
        }).addTo(carte)
        carte.fitBounds(calque.getBounds())
        calque.bringToBack()
      }
    } catch (erreur) {
      console.error("❌ Impossible de charger la frontière :", erreur)
    }
  }

  const chargerInfrastructure = async (
    dessinerCables: (data: any) => void,
    dessinerNoeuds: (data: any) => void
  ) => {
    try {
      const [repCables, repNoeuds] = await Promise.all([
        AuthService.apiCall(`${BASE_URL}/api/cables/`),
        AuthService.apiCall(`${BASE_URL}/api/noeuds/`)
      ])
      if (!repCables.ok || !repNoeuds.ok) throw new Error('Erreur serveur')

      const donneesCables = await repCables.json()
      const donneesNoeuds = await repNoeuds.json()

      const geoJsonCables = donneesCables.results?.type === 'FeatureCollection'
        ? donneesCables.results
        : donneesCables.type === 'FeatureCollection' ? donneesCables : null
      if (geoJsonCables) dessinerCables(geoJsonCables)
      else console.warn("⚠️ Aucun GeoJSON câbles trouvé")

      const geoJsonNoeuds = donneesNoeuds.results?.type === 'FeatureCollection'
        ? donneesNoeuds.results
        : donneesNoeuds.type === 'FeatureCollection' || donneesNoeuds.features ? donneesNoeuds : null
      if (geoJsonNoeuds) dessinerNoeuds(geoJsonNoeuds)
      else console.warn("⚠️ Aucun GeoJSON nœuds trouvé")

      console.log("✅ INFRASTRUCTURE COMPLÈTE CHARGÉE !")
    } catch (erreur) {
      console.error("❌ Échec du chargement :", erreur)
    }
  }

  return { map, utilisateurNom, initMap, dessinerFrontiere, chargerInfrastructure }
}
