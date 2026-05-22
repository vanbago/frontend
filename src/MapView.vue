<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from './services/auth'
import { useDrag } from './composables/useDrag'
import { useMap } from './composables/useMap'
import { useCables } from './composables/useCables'
import { useNoeuds } from './composables/useNoeuds'
import { useInspection } from './composables/useInspection'
import { useReseauStore } from './stores/reseau'
import 'leaflet-editable'

import LegendeMap from './components/map/LegendeMap.vue'
import InspectionCable from './components/map/InspectionCable.vue'
import InspectionNoeud from './components/map/InspectionNoeud.vue'
import FormulaireNoeud from './components/map/FormulaireNoeud.vue'
import PopupAjouterManchon from './components/map/PopupAjouterManchon.vue'
import InspectionOdf from './components/map/inspectionOdf.vue'
import FormulaireOdf from './components/map/FormulaireOdf.vue'
import PickerFibre from './components/map/PickerFibre.vue'
import { DICTIONNAIRE_COULEURS } from './composables/useCables'
import { useOdf } from './composables/useOdf'


// ===== ROUTER =====
const router = useRouter()
const deconnecter = () => { AuthService.logout(); router.push('/login') }

// ===== COMPOSABLES =====
const { fenetres, demarrerDrag } = useDrag()
const { map, utilisateurNom, initMap, dessinerFrontiere } = useMap()
const store = useReseauStore()

const cables = useCables(map)
const noeuds = useNoeuds(map)
const inspection = useInspection()
const odf = useOdf()

const chargerInfrastructure = async () => {
  await store.chargerInfrastructure()
  if (store.geoJsonCables) cables.dessinerCables(store.geoJsonCables)
  if (store.geoJsonNoeuds) noeuds.dessinerNoeuds(store.geoJsonNoeuds)
}

const rechargerNoeuds = async () => {
  await store.chargerNoeuds()
  if (store.geoJsonNoeuds) noeuds.dessinerNoeuds(store.geoJsonNoeuds)
}

// ===== MENU CRÉATION =====
const menuCreationOuvert = ref(false)
const ouvrirMenuCreation = () => { menuCreationOuvert.value = !menuCreationOuvert.value }

const choisirCreation = (type: 'noeud' | 'cable') => {
  menuCreationOuvert.value = false
  if (type === 'noeud') noeuds.ouvrirPanneau()
  else cables.ouvrirPanneauCable()
}

// ===== WIRING: ODF =====
const onOuvrirOdf = (odfId: string) => odf.chargerOdf(odfId)

const odfCableNom = ref('')
const odfNoeudNom = ref('')

const onCreerOdf = (noeudId: string, cableId: string, cableNom: string) => {
  odfNoeudNom.value = noeuds.noeudEnInspection.value?.nom_code ?? ''
  odfCableNom.value = cableNom
  odf.ouvrirPanneauCreation(noeudId, cableId)
}

const onSauvegarderOdf = async () => {
  const noeudId = noeuds.noeudEnInspection.value?.id
  await odf.creerOdf(() => {
    if (noeudId) noeuds.inspecterNoeud(noeudId)
  })
}

// ===== WIRING: actions depuis InspectionNoeud =====
const onInspecterCable = (id: string) => cables.inspecterCable(id)
const onVoirSoudures = (manchonId: string, manchonNom?: string, enAttente?: boolean) => inspection.voirSoudures(manchonId, manchonNom, enAttente)
const onVoirSouduresNoeud = (noeudId: string, noeudNom?: string) => inspection.voirSouduresNoeud(noeudId, noeudNom)
const onInstallerManchon = (noeudId: string) => alert(`Fonctionnalité à venir : Installer manchon dans le nœud ${noeudId}`)
const onAjouterManchon = (noeudId: string) => {
  const noeud = noeuds.noeudEnInspection.value
  const nom = noeud?.nom_code ?? noeudId
  const cables = noeuds.cablesTransitUniques.value
  noeuds.ouvrirPopupAjouterManchon(noeudId, nom, cables)
}

// ===== CYCLE DE VIE =====
onMounted(async () => {
  await initMap()
  dessinerFrontiere()
  chargerInfrastructure()
  await noeuds.chargerCentres()
})

onUnmounted(() => { map.value?.remove() })
</script>


<template>
  <div class="flex flex-col h-screen w-full overflow-hidden font-sans" style="background:#1a1f2e">

    <!-- HEADER -->
    <header class="h-14 flex items-center justify-between px-4 z-20 shrink-0 border-b"
            style="background:#1e2433; border-color:#2d3448">
      <div class="flex items-center gap-4 flex-1">
        <div class="flex items-center gap-2 cursor-pointer shrink-0">
          <span class="text-2xl">🌍</span>
          <span class="text-xl font-bold tracking-tight hidden sm:block" style="color:#38bdf8"><i>Optis_OTN</i></span>
        </div>
        <div class="flex items-center rounded px-2 py-1 max-w-sm w-full border" style="background:#252c3d; border-color:#3a4257">
          <span class="text-sm mr-2" style="color:#64748b">🔍</span>
          <input type="text" placeholder="Rechercher un BPEO, un câble..."
                 class="bg-transparent border-none outline-none text-sm w-full" style="color:#cbd5e1" />
          <button class="text-xs font-bold py-1 px-3 rounded ml-2 transition-colors" style="background:#38bdf8; color:#0f172a">Aller</button>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-px h-6 mx-1 hidden md:block" style="background:#3a4257"></div>
        <span v-if="utilisateurNom" class="text-xs hidden md:block" style="color:#64748b">👤 {{ utilisateurNom }}</span>
        <button @click="deconnecter" class="px-3 py-1 text-sm font-bold transition" style="color:#64748b" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='#64748b'">Déconnexion</button>
      </div>
    </header>

    <main class="relative flex-1 w-full h-full overflow-hidden">

      <!-- CARTE LEAFLET -->
      <div id="map" class="absolute inset-0 z-0"></div>

      <!-- LÉGENDE -->
      <LegendeMap />

      <!-- OUTILS CARTE (haut droite) -->
      <div class="absolute top-4 right-4 z-[1000] rounded-xl shadow-xl flex flex-col gap-0.5 p-1.5 border"
           style="background:#1e2433cc; backdrop-filter:blur(8px); border-color:#3a4257">
        <button class="p-2 rounded-lg transition" style="color:#94a3b8" title="Mesure">
          <span class="text-sm">📏</span>
        </button>
        <router-link to="/inventaire" class="p-2 rounded-lg transition flex items-center justify-center" style="color:#94a3b8" title="Inventaire">
          <span class="text-sm">📖</span>
        </router-link>
        <div class="h-px w-full my-0.5" style="background:#3a4257"></div>

        <!-- Bouton Créer -->
        <div class="relative">
          <button @click="ouvrirMenuCreation"
                  class="p-2 rounded-lg transition font-bold text-sm" style="background:#38bdf8; color:#0f172a" title="Créer...">
            ＋
          </button>
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-2"
          >
            <div v-if="menuCreationOuvert"
                 class="absolute top-full mt-2 right-0 rounded-xl shadow-2xl overflow-hidden min-w-[170px] z-10 border"
                 style="background:#1e2433; border-color:#3a4257">
              <button @click="choisirCreation('noeud')"
                      class="w-full px-4 py-3 text-left text-sm flex items-center gap-3 border-b transition"
                      style="color:#cbd5e1; border-color:#2d3448"
                      onmouseover="this.style.background='#252c3d'" onmouseout="this.style.background='transparent'">
                <span class="text-lg">📍</span>
                <span class="font-medium">Nouveau Nœud</span>
              </button>
              <button @click="choisirCreation('cable')"
                      class="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition"
                      style="color:#cbd5e1"
                      onmouseover="this.style.background='#252c3d'" onmouseout="this.style.background='transparent'">
                <span class="text-lg">🔌</span>
                <span class="font-medium">Nouveau Câble</span>
              </button>
            </div>
          </transition>
        </div>

        <div class="h-px w-full my-0.5" style="background:#3a4257"></div>
      </div>

      <!-- INSPECTION CÂBLE -->
      <InspectionCable
        :visible="cables.afficherInspection.value"
        :cable="cables.cableEnInspection.value"
        :chargement="cables.chargementInspection.value"
        :position="fenetres.inspection"
        :fibres-par-tube="cables.fibresParTube.value"
        :structure-cable="cables.structureCable.value"
        @close="cables.fermerInspection"
        @start-drag="demarrerDrag"
        @modifier-cable="(id) => cables.ouvrirEditionCable(id)"
        @supprimer-cable="(id, nom) => cables.supprimerCable(id, nom, chargerInfrastructure)"
      />

      <!-- FORMULAIRE NŒUD -->
      <FormulaireNoeud
        :visible="noeuds.panneauOuvert.value"
        :est-edition="!!noeuds.noeudEnEditionId.value"
        :position="fenetres.creation"
        :formulaire="noeuds.formulaireNoeud"
        :centres-disponibles="noeuds.centresDisponibles.value"
        @close="noeuds.fermerPanneau"
        @start-drag="demarrerDrag"
        @save="noeuds.sauvegarderNouveauNoeud(rechargerNoeuds)"
      />
              
      <!-- POPUP AJOUTER MANCHON -->
       <PopupAjouterManchon
        :visible="noeuds.popupAjouterManchonVisible.value"
        :position="fenetres.ajouterManchon"
        :noeud-id="noeuds.noeudPourManchon.value?.id ?? ''"
        :noeud-nom="noeuds.noeudPourManchon.value?.nom ?? ''"
        :cables-disponibles="noeuds.cablesDisponiblesPourManchon.value"
        :chargement="noeuds.chargementAjoutManchon.value"
        @close="noeuds.fermerPopupAjouterManchon"
        @start-drag="demarrerDrag"
        @creer="(payload) => noeuds.creerManchon(payload, chargerInfrastructure)"
      />

      <!-- FORMULAIRE CÂBLE -->
      <transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div v-if="cables.panneauCableOuvert.value"
             class="absolute z-[3000] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
             style="width: 340px; max-height: 85vh;"
             :style="{ left: fenetres.creationCable.x + 'px', top: fenetres.creationCable.y + 'px' }"
             @mousedown.stop @click.stop>

          <div @mousedown.stop.prevent="demarrerDrag($event, 'creationCable')"
               class="bg-blue-50 px-4 py-3 border-b border-blue-200 cursor-move flex justify-between items-center select-none">
            <h3 class="font-bold text-blue-800 text-sm flex items-center gap-2">
              <span class="text-blue-600">🔌</span>
              {{ cables.cableEnEditionId.value ? '✏️ Modifier le câble' : 'Nouveau Câble' }}
            </h3>
            <button @mousedown.stop @click.stop="cables.fermerPanneauCable"
                    class="text-gray-400 hover:text-red-500 text-xl font-bold leading-none">&times;</button>
          </div>

          <div class="p-4 flex-1 overflow-y-auto flex flex-col gap-3" @mousedown.stop>
            <p class="text-xs text-gray-500 mb-2 font-medium">Créez un câble en reliant deux nœuds existants.</p>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nom / Code du câble</label>
              <input v-model="cables.formulaireCable.nom_code" type="text" placeholder="Ex: CABLE_MBA_YAO_001"
                     class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nœud de départ</label>
              <select v-model="cables.formulaireCable.noeud_depart_id"
                      class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">-- Sélectionner --</option>
                <option v-for="noeud in cables.noeudsDisponibles.value" :key="noeud.id" :value="noeud.id">
                  {{ noeud.nom }} ({{ noeud.type }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nœud de fin</label>
              <select v-model="cables.formulaireCable.noeud_fin_id"
                      class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">-- Sélectionner --</option>
                <option v-for="noeud in cables.noeudsDisponibles.value" :key="noeud.id" :value="noeud.id"
                        :disabled="noeud.id === cables.formulaireCable.noeud_depart_id">
                  {{ noeud.nom }} ({{ noeud.type }})
                </option>
              </select>
            </div>

            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-xs font-bold text-gray-700 mb-1">Capacité (fibres)</label>
                <select v-model="cables.formulaireCable.capacite_fibres"
                        class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                  <option :value="6">6 FO</option><option :value="12">12 FO</option>
                  <option :value="24">24 FO</option><option :value="48">48 FO</option>
                  <option :value="72">72 FO</option><option :value="96">96 FO</option>
                  <option :value="144">144 FO</option><option :value="288">288 FO</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-bold text-gray-700 mb-1">Norme couleurs *</label>
                <select v-model="cables.formulaireCable.norme_id"
                        class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                  <option value="">-- Sélectionner --</option>
                  <option v-for="norme in cables.normesDisponibles.value" :key="norme.id" :value="norme.id">
                    {{ norme.code }}
                  </option>
                </select>
              </div>
            </div>

            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-xs font-bold text-gray-700 mb-1">Technologie</label>
                <select v-model="cables.formulaireCable.technologie_transport"
                        class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                  <option value="FO">Fibre Optique</option>
                  <option value="FH">Faisceau Hertzien</option>
                  <option value="SAT">Satellite</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-bold text-gray-700 mb-1">Statut</label>
                <select v-model="cables.formulaireCable.statut_physique"
                        class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                  <option value="EN_SERVICE">En service</option>
                  <option value="EN_PROJET">En projet</option>
                  <option value="HORS_SERVICE">Hors service</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Centre propriétaire</label>
              <!-- Super admin : dropdown pour choisir n'importe quel centre -->
              <select v-if="cables.estSuperAdmin.value"
                      v-model="cables.formulaireCable.centre_proprietaire_id"
                      class="w-full text-sm p-1.5 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">-- Sélectionner un centre --</option>
                <option v-for="c in cables.centresDisponibles.value" :key="c.id" :value="c.id">
                  🏢 {{ c.nom }}
                </option>
              </select>
              <!-- Utilisateur normal : centre affiché en lecture seule -->
              <div v-else-if="cables.centreUtilisateurNom.value"
                   class="w-full text-sm p-1.5 border border-gray-200 rounded bg-gray-50 text-gray-600 flex items-center gap-2">
                <span class="text-xs">🏢</span>
                <span>{{ cables.centreUtilisateurNom.value }}</span>
              </div>
              <div v-else class="w-full text-sm p-1.5 border border-red-200 rounded bg-red-50 text-red-600 text-xs">
                ⚠️ Aucun centre assigné à votre profil — contactez un administrateur
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Longueur (mètres)</label>
              <input v-model="cables.formulaireCable.longueur_reelle_metres" type="number" placeholder="Ex: 12500"
                     class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none">
            </div>
          </div>

          <div class="p-3 border-t border-gray-200 bg-gray-50 flex gap-2 justify-end" @mousedown.stop>
            <button @click="cables.fermerPanneauCable"
                    class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100">
              Annuler
            </button>
            <button @click="cables.sauvegarderNouveauCable(chargerInfrastructure)"
                    class="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 shadow-sm">
              {{ cables.cableEnEditionId.value ? 'Enregistrer' : 'Créer Câble' }}
            </button>
          </div>
        </div>
      </transition>

      <!-- INSPECTION NŒUD -->
      <InspectionNoeud
        :visible="noeuds.afficherInspectionNoeud.value"
        :noeud="noeuds.noeudEnInspection.value"
        :chargement="noeuds.chargementInspectionNoeud.value"
        :position="fenetres.inspectionNoeud"
        :cables-transit-uniques="noeuds.cablesTransitUniques.value"
        @close="noeuds.fermerInspectionNoeud"
        @start-drag="demarrerDrag"
        @inspecter-cable="onInspecterCable"
        @voir-soudures="onVoirSoudures"
        @voir-soudures-noeud="onVoirSouduresNoeud"
        @installer-manchon="onInstallerManchon"
        @ajouter-manchon="onAjouterManchon"
        @modifier-noeud="(id) => noeuds.ouvrirEditionNoeud(id)"
        @supprimer-noeud="(id, nom) => noeuds.supprimerNoeud(id, nom, chargerInfrastructure)"
        @supprimer-manchon="(id, nom) => noeuds.supprimerManchon(id, nom, chargerInfrastructure)"
        @ouvrir-odf="onOuvrirOdf"
        @creer-odf="onCreerOdf"
      />

      <!-- FORMULAIRE ODF -->
      <FormulaireOdf
        :visible="odf.panneauCreationOuvert.value"
        :position="fenetres.creationOdf"
        :noeud-nom="odfNoeudNom"
        :cable-nom="odfCableNom"
        :formulaire="odf.formulaireOdf"
        :chargement="odf.chargementOdf.value"
        @close="odf.fermerPanneauCreation"
        @start-drag="demarrerDrag"
        @creer="onSauvegarderOdf"
      />

      <!-- INSPECTION ODF -->
      <InspectionOdf
        v-if="odf.afficherOdf.value"
        :odf="odf.odfEnDetail.value"
        :chargement="odf.chargementOdf.value"
        :position="fenetres.inspectionOdf"
        @placer-fibre="odf.ouvrirPickerFibre"
        @retirer-fibre="(portId) => odf.retirerFibre(portId)"
        @deplacer-fibre="(src, dst) => odf.deplacerFibre(src, dst)"
        @redimensionner="(l, c) => odf.redimensionnerOdf(l, c)"
        @supprimer="() => odf.supprimerOdf(chargerInfrastructure)"
        @actualiser="() => odf.odfEnDetail.value && odf.chargerOdf(odf.odfEnDetail.value.id)"
        @fermer="odf.fermerOdf"
        @start-drag="demarrerDrag"
      />

      <!-- PICKER FIBRE -->
      <PickerFibre
        :visible="odf.portPourPlacement.value !== null"
        :position="fenetres.pickerFibre"
        :fibres="odf.fibresLibres.value"
        :chargement="odf.chargementFibres.value"
        @choisir="(fibreId) => odf.placerFibre(odf.portPourPlacement.value!, fibreId)"
        @close="odf.fermerPickerFibre"
        @start-drag="demarrerDrag"
      />

      <!-- MATRICE DE SOUDURES -->
      <transition
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="translate-y-4 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-transform duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-4 opacity-0"
      >
        <div v-if="inspection.afficherMatrice.value"
             class="absolute z-[5000] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
             style="width: 520px; max-height: 85vh;"
             :style="{ left: fenetres.matrice.x + 'px', top: fenetres.matrice.y + 'px' }"
             @mousedown.stop @click.stop>

          <div @mousedown.stop.prevent="demarrerDrag($event, 'matrice')"
               class="px-4 py-3 cursor-move flex justify-between items-center select-none bg-amber-50 border-b border-amber-200">
            <h3 class="font-bold text-sm text-amber-800 flex items-center gap-2">
              🔶 Matrice de soudures
              <span v-if="inspection.manchonNomEnMatrice.value" class="font-normal text-amber-600">
                — {{ inspection.manchonNomEnMatrice.value }}
              </span>
            </h3>
            <button @mousedown.stop @click.stop="inspection.fermerMatrice"
                    class="text-gray-400 hover:text-red-500 text-xl font-bold leading-none p-1">&times;</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4" @mousedown.stop>
            <div v-if="inspection.chargementMatrice.value" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent"></div>
            </div>

            <div v-else-if="inspection.manchonEnMatrice.value">
              <!-- Stats -->
              <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                  <p class="text-lg font-bold text-gray-700">{{ inspection.manchonEnMatrice.value.stats.total_fibres }}</p>
                  <p class="text-[10px] text-gray-500 uppercase">Total fibres</p>
                </div>
                <div class="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                  <p class="text-lg font-bold text-green-700">{{ inspection.manchonEnMatrice.value.stats.fibres_soudees }}</p>
                  <p class="text-[10px] text-green-500 uppercase">Soudées</p>
                </div>
                <div class="bg-orange-50 rounded-lg p-2 text-center border border-orange-200">
                  <p class="text-lg font-bold text-orange-700">{{ inspection.manchonEnMatrice.value.stats.fibres_libres }}</p>
                  <p class="text-[10px] text-orange-500 uppercase">Libres</p>
                </div>
              </div>

              <!-- Bannière manchon en attente -->
              <div v-if="inspection.manchonEstEnAttente.value"
                   class="mb-3 bg-orange-50 border border-orange-300 rounded-lg px-3 py-2">
                <p class="text-xs text-orange-700 flex items-center gap-2">
                  <span>⏳</span>
                  <span>
                    Manchon en attente — tous les câbles du nœud sont affichés.
                    <b>Associez des câbles</b> pour limiter la vue à vos connexions réelles.
                  </span>
                </p>
              </div>

              <!-- Filtres -->
              <div class="flex gap-2 mb-3">
                <select v-model="inspection.filtreCableSource.value"
                        class="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-400">
                  <option value="">Tous les câbles</option>
                  <option v-for="c in inspection.manchonEnMatrice.value.cables" :key="c.cable_id" :value="c.cable_id">
                    {{ c.cable_nom }}
                  </option>
                </select>
                <select v-model="inspection.filtreEtat.value"
                        class="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-400">
                  <option value="">Toutes les fibres</option>
                  <option value="soudees">Soudées</option>
                  <option value="libres">Libres</option>
                </select>
              </div>

              <!-- Bannière mode soudure -->
              <div v-if="inspection.modeSoudure.actif"
                   class="mb-3 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 flex justify-between items-center">
                <span class="text-xs text-amber-700 font-medium">
                  🔗 Source : <b>{{ inspection.modeSoudure.cableSource?.cable_nom }}</b>
                  T{{ inspection.modeSoudure.fibreSource?.numero_tube }}-F{{ inspection.modeSoudure.fibreSource?.numero_fibre }}
                  — Cliquez la fibre destination
                </span>
                <button @click="inspection.annulerSoudure" class="text-xs text-red-500 hover:text-red-700 font-bold">Annuler</button>
              </div>

              <!-- Câbles et fibres -->
              <div v-for="cable in inspection.manchonEnMatrice.value.cables" :key="cable.cable_id" class="mb-4">
                <h4 class="text-xs font-bold text-gray-600 uppercase mb-2 flex items-center gap-2">
                  🔌 {{ cable.cable_nom }}
                  <span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-normal">{{ cable.capacite }} FO</span>
                </h4>
                <div class="space-y-1">
                  <div v-for="fibre in inspection.filtrerFibres(cable)" :key="fibre.fibre_id"
                       class="flex items-center gap-2 text-xs rounded px-2 py-1 cursor-pointer transition-colors"
                       :class="[
                         inspection.modeSoudure.fibreSource?.fibre_id === fibre.fibre_id
                           ? 'bg-amber-100 border border-amber-400 ring-1 ring-amber-300'
                           : fibre.soudure_id
                             ? 'bg-green-50 border border-green-100 hover:bg-green-100'
                             : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                       ]"
                       @click="inspection.selectionnerFibre(cable, fibre)">
                    <span class="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
                          :style="{ backgroundColor: DICTIONNAIRE_COULEURS[fibre.code_couleur_hex ?? 'INCONNUE']?.bg ?? '#9ca3af' }"></span>
                    <span class="text-gray-500 w-16 flex-shrink-0">T{{ fibre.numero_tube }}-F{{ fibre.numero_fibre }}</span>
                    <span v-if="fibre.fibre_connectee_cable" class="text-green-700 flex-1 truncate">
                      ↔ {{ fibre.fibre_connectee_cable }} T{{ fibre.fibre_connectee_tube }}-F{{ fibre.fibre_connectee_numero }}
                    </span>
                    <span v-else class="text-gray-400 flex-1 italic">Libre</span>
                    <span v-if="fibre.soudure_statut" class="px-1.5 py-0.5 rounded-full text-[10px]"
                          :class="fibre.soudure_statut === 'BON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                      {{ fibre.soudure_statut }}
                    </span>
                    <button v-if="fibre.soudure_id"
                            @click.stop="inspection.supprimerSoudure(fibre.soudure_id)"
                            class="text-red-400 hover:text-red-600 font-bold text-xs leading-none px-1">✕</button>
                  </div>
                </div>
              </div>

              <!-- Actions batch -->
              <div class="flex gap-2 pt-3 border-t border-gray-200 mt-2">
                <button @click="inspection.souderTout1a1"
                        class="flex-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-bold py-1.5 px-3 rounded border border-green-200 transition-colors">
                  ⚡ Souder 1:1
                </button>
                <button @click="inspection.dessouderTout"
                        class="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold py-1.5 px-3 rounded border border-red-200 transition-colors">
                  🗑 Tout désouder
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>


    </main>
  </div>
</template>

<style scoped>
#map {
  width: 100%;
  height: 100%;
  z-index: 10;
}
</style>

<style>
.leaflet-tooltip.noeud-label {
  background: rgba(15, 23, 42, 0.88);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  font-family: 'Inter', system-ui, sans-serif;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  pointer-events: none;
  letter-spacing: 0.02em;
}
.leaflet-tooltip.noeud-label::before { display: none; }

.noeud-label-centre          { color: #fca5a5; }
.noeud-label-bts             { color: #67e8f9; }
.noeud-label-client          { color: #f9a8d4; }
.noeud-label-chambre         { color: #93c5fd; }
.noeud-label-manchon         { color: #fcd34d; }
.noeud-label-manchon_enterre { color: #d6d3d1; }
.noeud-label-manchon_aerien  { color: #c4b5fd; }
.noeud-label-poteau          { color: #bef264; }

/* Zoom < 15 : seuls CENTRE et BTS visibles */
.leaflet-container:not(.zoom-detaille) .leaflet-tooltip.noeud-label:not(.noeud-label-centre):not(.noeud-label-bts) {
  display: none;
}
</style>
