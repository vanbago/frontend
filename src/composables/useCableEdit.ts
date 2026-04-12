// src/composables/useCableEdit.ts
import { ref, shallowRef } from 'vue'
import L from 'leaflet'
import AuthService from '../services/auth'

const BASE_URL = AuthService.getBaseURL()

// Le câble actuellement en cours d'édition
// shallowRef évite que Vue enveloppe l'objet Leaflet dans un proxy profond
const cableEnEdition = ref<string | null>(null)
const polylineEnEdition = shallowRef<L.Polyline | null>(null)

// Helpers pour les méthodes ajoutées par leaflet-editable (non typées dans @types/leaflet)
const enableEdit  = (p: L.Polyline) => (p as any).enableEdit()
const disableEdit = (p: L.Polyline) => (p as any).disableEdit()
const revertLayer = (p: L.Polyline) => (p as any).editor?.revertLayer()
const getMap      = (p: L.Polyline): L.Map | undefined => (p as any)._map

export function useCableEdit() {

    // Activer l'édition sur un câble cliqué
    const activerEditionCable = (
        polyline: L.Polyline,
        cableId: string,
        onSave: () => void
    ) => {
        // Si un autre câble était en édition, on annule
        if (polylineEnEdition.value && polylineEnEdition.value !== polyline) {
            annulerEdition()
        }

        cableEnEdition.value = cableId
        polylineEnEdition.value = polyline

        // Leaflet.Editable — activer l'édition sur cette polyline
        enableEdit(polyline)

        // Changer le style pour indiquer que c'est en mode édition
        polyline.setStyle({
            color: '#f59e0b',   // orange = mode édition
            weight: 5,
            dashArray: '6 4'
        })

        // Afficher une barre d'outils flottante sur la carte
        afficherBarreEdition(polyline, cableId, onSave)
    }

    // Sauvegarder la nouvelle géométrie vers le backend
    const sauvegarderGeometrie = async (
        cableId: string,
        polyline: L.Polyline,
        onSuccess: () => void
    ) => {
        // Récupérer les coordonnées modifiées depuis Leaflet
        const latlngs = polyline.getLatLngs() as L.LatLng[]

        // Convertir en GeoJSON LineString (format attendu par PostGIS)
        const geometrieGeoJSON = {
            type: 'LineString',
            coordinates: latlngs.map(pt => [pt.lng, pt.lat])
            // ↑ GeoJSON = [longitude, latitude] — ordre inversé par rapport à Leaflet
        }

        try {
            const response = await AuthService.apiCall(
                `${BASE_URL}/api/cables/${cableId}/`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ geometrie: geometrieGeoJSON })
                }
            )

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.detail || `Erreur ${response.status}`)
            }

            // Désactiver l'édition et restaurer le style normal
            terminerEdition(polyline)
            onSuccess()

        } catch (erreur: any) {
            alert(`Erreur sauvegarde : ${erreur.message}`)
        }
    }

    // Annuler — restaurer la géométrie d'origine
    const annulerEdition = () => {
        if (!polylineEnEdition.value) return
        // Leaflet.Editable garde l'historique — revertLayer() restaure
        revertLayer(polylineEnEdition.value)
        terminerEdition(polylineEnEdition.value)
    }

    const terminerEdition = (polyline: L.Polyline) => {
        disableEdit(polyline)
        polyline.setStyle({
            color: '#3b82f6',   // bleu = style normal
            weight: 3,
            dashArray: undefined
        })
        // supprimerBarreEdition() doit être appelé avant de nullifier polylineEnEdition
        supprimerBarreEdition()
        cableEnEdition.value = null
        polylineEnEdition.value = null
    }

    // ── Barre flottante ─────────────────────────────────────────────────

    let barreControl: L.Control | null = null

    const afficherBarreEdition = (
        polyline: L.Polyline,
        cableId: string,
        onSave: () => void
    ) => {
        // Créer un contrôle Leaflet personnalisé
        const BarreEdition = L.Control.extend({
            options: { position: 'topright' },
            onAdd() {
                const div = L.DomUtil.create('div',
                    'bg-white rounded-lg shadow-lg border border-amber-300 p-2 flex gap-2'
                )
                div.innerHTML = `
                    <span class="text-xs text-amber-700 font-bold self-center mr-1">
                        ✏️ Mode édition tracé
                    </span>
                    <button id="btn-save-geo"
                        class="text-xs bg-green-500 text-white font-bold px-3 py-1 rounded hover:bg-green-600">
                        💾 Sauvegarder
                    </button>
                    <button id="btn-cancel-geo"
                        class="text-xs bg-gray-200 text-gray-700 font-bold px-3 py-1 rounded hover:bg-gray-300">
                        ✕ Annuler
                    </button>
                `
                // Empêcher le clic sur la barre de propager à la carte
                L.DomEvent.disableClickPropagation(div)

                div.querySelector('#btn-save-geo')?.addEventListener('click', () => {
                    sauvegarderGeometrie(cableId, polyline, onSave)
                })
                div.querySelector('#btn-cancel-geo')?.addEventListener('click', () => {
                    annulerEdition()
                })
                return div
            }
        })

        barreControl = new BarreEdition()
        getMap(polyline)?.addControl(barreControl)
    }

    const supprimerBarreEdition = () => {
        const carte = polylineEnEdition.value ? getMap(polylineEnEdition.value) : undefined
        if (barreControl && carte) {
            carte.removeControl(barreControl)
            barreControl = null
        }
    }

    return {
        cableEnEdition,
        activerEditionCable,
        sauvegarderGeometrie,
        annulerEdition
    }
}