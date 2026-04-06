<script setup lang="ts">
import type { NoeudCentreInspection, CableResum } from '../../types/map'
import { styleParType } from '../../composables/useNoeuds'
import { formaterLongueur } from '../../composables/useCables'
import type { NomFenetre } from '../../composables/useDrag'

defineProps<{
  visible: boolean
  noeud: NoeudCentreInspection | null
  chargement: boolean
  position: { x: number; y: number }
  cablesTransitUniques: CableResum[]
}>()

const emit = defineEmits<{
  close: []
  startDrag: [event: MouseEvent, fenetre: NomFenetre]
  inspecterCable: [id: string]
  voirSoudures: [manchonId: string, manchonNom?: string]
  voirSouduresNoeud: [noeudId: string, noeudNom?: string]
  installerManchon: [noeudId: string]
  ajouterManchon: [noeudId: string]
}>()
</script>

<template>
  <transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="-translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="-translate-x-full opacity-0"
  >
    <div v-if="visible"
         class="absolute z-[4500] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
         style="width: 400px; max-height: 85vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- Barre titre draggable -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'inspectionNoeud')"
           class="px-4 py-3 cursor-move flex justify-between items-center select-none"
           :class="noeud ? styleParType(noeud.type_noeud).couleurTexte.replace('text-', 'bg-').replace('600', '100') : 'bg-gray-100'">
        <h3 class="font-bold text-sm flex items-center gap-2"
            :class="noeud ? styleParType(noeud.type_noeud).couleurTexte : 'text-gray-800'">
          <span>{{ noeud ? styleParType(noeud.type_noeud).icone : '🔍' }}</span>
          {{ noeud?.nom_code || 'Chargement...' }}
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-gray-400 hover:text-red-500 text-xl font-bold leading-none p-1">&times;</button>
      </div>

      <!-- Contenu -->
      <div class="flex-1 overflow-y-auto p-4" @mousedown.stop>

        <!-- Chargement -->
        <div v-if="chargement" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>

        <div v-else-if="noeud">

          <!-- Infos générales -->
          <div class="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
            <div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <p><b>Type:</b> {{ noeud.type_noeud_label }}</p>
              <p><b>Énergie:</b> {{ noeud.statut_energie || 'N/A' }}</p>
              <p><b>État:</b> {{ noeud.statut_operationnel || 'N/A' }}</p>
              <p><b>Modifié:</b> {{ noeud.date_modification?.split('T')[0] || 'N/A' }}</p>
            </div>
          </div>

          <!-- CENTRE / BTS / CLIENT / POTEAU -->
          <template v-if="!['CHAMBRE','MANCHON','MANCHON_ENTERRE','MANCHON_AERIEN'].includes(noeud.type_noeud)">

            <!-- ODF / Boîtiers -->
            <div class="mb-4">
              <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                📦 ODF / Boîtiers
                <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.boitiers.length }}</span>
              </h4>
              <div v-if="noeud.contenu.boitiers.length > 0" class="space-y-2">
                <div v-for="odf in noeud.contenu.boitiers" :key="odf.id"
                     class="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-blue-800 text-sm">📋 {{ odf.nom_reference || 'Boîtier sans nom' }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full"
                          :class="odf.etat === 'BON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                      {{ odf.etat || 'Inconnu' }}
                    </span>
                  </div>
                  <div class="flex justify-between text-xs text-blue-600 mt-1">
                    <span>{{ odf.type_label }}</span>
                    <span v-if="odf.nombre_cassettes">{{ odf.nombre_cassettes }} cassette(s)</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 italic">Aucun boîtier enregistré</p>
            </div>

            <!-- Câbles connectés -->
            <div class="mb-4">
              <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                🔌 Câbles Connectés
                <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.cables?.length || 0 }}</span>
              </h4>
              <div v-if="noeud.contenu.cables?.length > 0" class="space-y-2">
                <div v-for="cable in noeud.contenu.cables" :key="cable.id"
                     class="bg-indigo-50 border border-indigo-200 rounded-lg p-2 cursor-pointer hover:bg-indigo-100 transition-colors"
                     @click="emit('inspecterCable', cable.id)">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-indigo-800 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                    <span class="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">{{ cable.capacite_fibres }} FO</span>
                  </div>
                  <div class="flex justify-between text-xs text-indigo-600 mt-1">
                    <span>{{ cable.technologie_transport || 'N/A' }}</span>
                    <span>{{ formaterLongueur(cable.longueur_reelle_metres) }}</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 italic">Aucun câble connecté</p>
            </div>

            <!-- Équipements -->
            <div class="mb-4">
              <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                ⚙️ Équipements Actifs
                <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.equipements?.length || 0 }}</span>
              </h4>
              <div v-if="noeud.contenu.equipements?.length > 0" class="space-y-2">
                <div v-for="equip in noeud.contenu.equipements" :key="equip.id"
                     class="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-emerald-800 text-sm">{{ equip.nom || 'Équipement sans nom' }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full"
                          :class="equip.statut === 'EN_SERVICE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
                      {{ equip.statut || 'Inconnu' }}
                    </span>
                  </div>
                  <div class="flex justify-between text-xs text-emerald-600 mt-1">
                    <span>{{ equip.type || 'Type inconnu' }}</span>
                    <span>{{ equip.marque || '' }}</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 italic">Aucun équipement enregistré</p>
            </div>
          </template>

          <!-- CHAMBRE : câbles en transit + installer manchon -->
          <template v-else-if="noeud.type_noeud === 'CHAMBRE'">
            <div class="mb-4">
              <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                🔌 Câbles en transit
                <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">{{ cablesTransitUniques.length }}</span>
              </h4>
              <div v-if="cablesTransitUniques.length > 0" class="space-y-2">
                <div v-for="cable in cablesTransitUniques" :key="cable.id"
                     class="bg-blue-50 border border-blue-200 rounded-lg p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                     @click="emit('inspecterCable', cable.id)">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-blue-800 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                    <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{{ cable.capacite_fibres }} FO</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 italic">Aucun câble ne passe par cette chambre</p>
            </div>

            <div class="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
              <p class="text-3xl mb-2">📭</p>
              <p class="text-sm text-gray-500 mb-3">Aucun manchon installé</p>
              <button @click="emit('installerManchon', noeud.id)"
                      class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-4 rounded transition-colors">
                ➕ Installer un manchon
              </button>
            </div>
          </template>

          <!-- MANCHON (dans chambre) : câbles + manchons installés + bouton ajouter -->
          <template v-else-if="noeud.type_noeud === 'MANCHON'">
            <div class="mb-4">
              <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                🔌 Câbles en transit
                <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.cables?.length || 0 }}</span>
              </h4>
              <div v-if="noeud.contenu.cables?.length > 0" class="space-y-2">
                <div v-for="cable in noeud.contenu.cables" :key="cable.id"
                     class="bg-blue-50 border border-blue-200 rounded-lg p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                     @click="emit('inspecterCable', cable.id)">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-blue-800 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                    <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{{ cable.capacite_fibres }} FO</span>
                  </div>
                  <div class="flex justify-between text-xs text-blue-600 mt-1">
                    <span>{{ cable.technologie_transport || 'N/A' }}</span>
                    <span>{{ formaterLongueur(cable.longueur_reelle_metres) }}</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 italic">Aucun câble en transit</p>
            </div>

            <div class="mb-4">
              <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                🔶 Manchons installés
                <span class="bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.manchons?.length || 0 }}</span>
              </h4>
              <div v-if="(noeud.contenu.manchons?.length ?? 0) > 0" class="space-y-2">
                <div v-for="manchon in noeud.contenu.manchons" :key="manchon.id"
                     class="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-amber-800 text-sm">🔶 {{ manchon.nom_reference || 'Manchon sans nom' }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full"
                          :class="manchon.etat === 'BON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                      {{ manchon.etat || 'Inconnu' }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-amber-600">{{ manchon.capacite_fibres }} fibres</span>
                    <button @click="emit('voirSoudures', manchon.id, manchon.nom_reference ?? undefined)"
                            class="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-2 rounded transition-colors">
                      🔍 Soudures
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 italic">Aucun manchon installé</p>
            </div>

            <button @click="emit('ajouterManchon', noeud.id)"
                    class="w-full bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold py-2 px-4 rounded border border-amber-300 transition-colors">
              ➕ Ajouter un manchon
            </button>
          </template>

          <!-- MANCHON_ENTERRE / MANCHON_AERIEN : manchon autonome → matrice directe via nœud -->
          <template v-else-if="['MANCHON_ENTERRE','MANCHON_AERIEN'].includes(noeud.type_noeud)">
            <div class="bg-stone-50 rounded-lg p-3 mb-4 border border-stone-200">
              <p class="text-xs text-stone-600 flex items-center gap-2">
                <span>{{ noeud.type_noeud === 'MANCHON_ENTERRE' ? '🔽' : '🔼' }}</span>
                Manchon autonome — la matrice de soudures est accessible via le bouton ci-dessous.
              </p>
            </div>

            <button @click="emit('voirSouduresNoeud', noeud.id, noeud.nom_code ?? undefined)"
                    class="w-full bg-stone-500 hover:bg-stone-600 text-white text-xs font-bold py-2 px-4 rounded transition-colors">
              🔍 Voir la matrice de soudures complète
            </button>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>
