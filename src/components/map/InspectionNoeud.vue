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
  voirSoudures: [manchonId: string, manchonNom?: string, enAttente?: boolean]
  voirSouduresNoeud: [noeudId: string, noeudNom?: string]
  installerManchon: [noeudId: string]
  ajouterManchon: [noeudId: string]
  modifierNoeud: [id: string]
  supprimerNoeud: [id: string, nom: string]
  supprimerManchon: [id: string, nom: string]
  ouvrirOdf: [odfId: string]
  creerOdf: [noeudId: string, cableId: string, cableNom: string]
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
         class="absolute z-[4500] bg-[#1e2433] rounded-xl shadow-2xl border border-[#2d3448] flex flex-col overflow-hidden"
         style="width: 400px; max-height: 85vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- Barre titre draggable -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'inspectionNoeud')"
           class="px-4 py-3 cursor-move flex justify-between items-center select-none bg-[#252c3d] border-b border-[#2d3448]">
        <h3 class="font-bold text-sm flex items-center gap-2"
            :class="noeud ? styleParType(noeud.type_noeud).couleurTexte : 'text-slate-300'">
          <span>{{ noeud ? styleParType(noeud.type_noeud).icone : '🔍' }}</span>
          {{ noeud?.nom_code || 'Chargement...' }}
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-slate-400 hover:text-red-400 text-xl font-bold leading-none p-1">&times;</button>
      </div>

      <!-- Contenu -->
      <div class="flex-1 overflow-y-auto p-4" @mousedown.stop>

        <div v-if="chargement" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>

        <div v-else-if="noeud">

          <!-- Infos générales -->
          <div class="bg-[#252c3d] rounded-lg p-3 mb-4 border border-[#3a4257]">
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <p><b class="text-slate-300">Type:</b> {{ noeud.type_noeud_label }}</p>
              <p><b class="text-slate-300">Énergie:</b> {{ noeud.statut_energie || 'N/A' }}</p>
              <p><b class="text-slate-300">État:</b> {{ noeud.statut_operationnel || 'N/A' }}</p>
              <p><b class="text-slate-300">Modifié:</b> {{ noeud.date_modification?.split('T')[0] || 'N/A' }}</p>
            </div>
          </div>

          <!-- CENTRE / BTS / CLIENT / POTEAU -->
          <template v-if="!['CHAMBRE','MANCHON','MANCHON_ENTERRE','MANCHON_AERIEN'].includes(noeud.type_noeud)">

            <!-- ODF / Boîtiers -->
            <div class="mb-4">
              <h4 class="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                📦 ODF / Boîtiers
                <span class="bg-[#3a4257] text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.boitiers.length }}</span>
              </h4>
              <div v-if="noeud.contenu.boitiers.length > 0" class="space-y-2">
                <div v-for="odf in noeud.contenu.boitiers" :key="odf.id"
                     class="bg-[#252c3d] border border-[#3a4257] rounded-lg p-2">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-slate-200 text-sm">📋 {{ odf.nom_reference || 'Boîtier sans nom' }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full"
                          :class="odf.etat === 'BON' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'">
                      {{ odf.etat || 'Inconnu' }}
                    </span>
                  </div>
                  <div class="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{{ odf.type_label }}</span>
                    <span v-if="odf.nombre_cassettes">{{ odf.nombre_cassettes }} cassette(s)</span>
                  </div>
                  <button @click="emit('ouvrirOdf', odf.id)"
                          class="mt-2 w-full text-xs bg-blue-800 hover:bg-blue-700 text-blue-200 font-bold py-1 px-2 rounded transition-colors">
                    📋 Ouvrir ODF
                  </button>
                </div>
              </div>
              <p v-else class="text-xs text-slate-500 italic">Aucun boîtier enregistré</p>
            </div>

            <!-- Câbles connectés -->
            <div class="mb-4">
              <h4 class="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                🔌 Câbles Connectés
                <span class="bg-[#3a4257] text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.cables?.length || 0 }}</span>
              </h4>
              <div v-if="noeud.contenu.cables?.length > 0" class="space-y-2">
                <div v-for="cable in noeud.contenu.cables" :key="cable.id"
                     class="bg-[#252c3d] border border-[#3a4257] rounded-lg p-2 cursor-pointer hover:bg-[#2d3a52] transition-colors"
                     @click="emit('inspecterCable', cable.id)">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-slate-200 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                    <span class="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">{{ cable.capacite_fibres }} FO</span>
                  </div>
                  <div class="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{{ cable.technologie_transport || 'N/A' }}</span>
                    <span>{{ formaterLongueur(cable.longueur_reelle_metres) }}</span>
                  </div>
                  <button v-if="cable.odf_id"
                          @click.stop="emit('ouvrirOdf', cable.odf_id!)"
                          class="mt-1.5 w-full text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-300 font-bold py-1 px-2 rounded transition-colors">
                    ✅ Voir ODF — {{ cable.odf_nom }}
                  </button>
                  <button v-else
                          @click.stop="emit('creerOdf', noeud.id, cable.id, cable.nom_code ?? '')"
                          class="mt-1.5 w-full text-xs bg-purple-900 hover:bg-purple-800 text-purple-300 font-bold py-1 px-2 rounded transition-colors">
                    📋 Créer ODF
                  </button>
                </div>
              </div>
              <p v-else class="text-xs text-slate-500 italic">Aucun câble connecté</p>
            </div>

            <!-- Équipements -->
            <div class="mb-4">
              <h4 class="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                ⚙️ Équipements Actifs
                <span class="bg-[#3a4257] text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.equipements?.length || 0 }}</span>
              </h4>
              <div v-if="noeud.contenu.equipements?.length > 0" class="space-y-2">
                <div v-for="equip in noeud.contenu.equipements" :key="equip.id"
                     class="bg-[#252c3d] border border-[#3a4257] rounded-lg p-2">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-slate-200 text-sm">{{ equip.nom || 'Équipement sans nom' }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full"
                          :class="equip.statut === 'EN_SERVICE' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'">
                      {{ equip.statut || 'Inconnu' }}
                    </span>
                  </div>
                  <div class="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{{ equip.type || 'Type inconnu' }}</span>
                    <span>{{ equip.marque || '' }}</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-slate-500 italic">Aucun équipement enregistré</p>
            </div>
          </template>

          <!-- CHAMBRE -->
          <template v-else-if="noeud.type_noeud === 'CHAMBRE'">
            <div class="mb-4">
              <h4 class="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                🔌 Câbles en transit
                <span class="bg-[#3a4257] text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">{{ cablesTransitUniques.length }}</span>
              </h4>
              <div v-if="cablesTransitUniques.length > 0" class="space-y-2">
                <div v-for="cable in cablesTransitUniques" :key="cable.id"
                     class="bg-[#252c3d] border border-[#3a4257] rounded-lg p-2 cursor-pointer hover:bg-[#2d3a52] transition-colors"
                     @click="emit('inspecterCable', cable.id)">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-slate-200 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                    <span class="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">{{ cable.capacite_fibres }} FO</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-slate-500 italic">Aucun câble ne passe par cette chambre</p>
            </div>

            <div class="bg-[#252c3d] border border-dashed border-[#3a4257] rounded-lg p-4 text-center">
              <p class="text-3xl mb-2">📭</p>
              <p class="text-sm text-slate-400 mb-3">Aucun manchon installé</p>
              <button @click="emit('installerManchon', noeud.id)"
                      class="bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold py-2 px-4 rounded transition-colors">
                ➕ Installer un manchon
              </button>
            </div>
          </template>

          <!-- MANCHON -->
          <template v-else-if="noeud.type_noeud === 'MANCHON'">
            <div class="mb-4">
              <h4 class="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                🔌 Câbles en transit
                <span class="bg-[#3a4257] text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.cables?.length || 0 }}</span>
              </h4>
              <div v-if="noeud.contenu.cables?.length > 0" class="space-y-2">
                <div v-for="cable in noeud.contenu.cables" :key="cable.id"
                     class="bg-[#252c3d] border border-[#3a4257] rounded-lg p-2 cursor-pointer hover:bg-[#2d3a52] transition-colors"
                     @click="emit('inspecterCable', cable.id)">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-slate-200 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                    <span class="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">{{ cable.capacite_fibres }} FO</span>
                  </div>
                  <div class="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{{ cable.technologie_transport || 'N/A' }}</span>
                    <span>{{ formaterLongueur(cable.longueur_reelle_metres) }}</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-slate-500 italic">Aucun câble en transit</p>
            </div>

            <div class="mb-4">
              <h4 class="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                🔶 Manchons installés
                <span class="bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded-full text-[10px]">{{ noeud.contenu.manchons?.length || 0 }}</span>
              </h4>
              <div v-if="(noeud.contenu.manchons?.length ?? 0) > 0" class="space-y-2">
                <div v-for="manchon in noeud.contenu.manchons" :key="manchon.id"
                     class="bg-[#252c3d] border border-[#3a4257] rounded-lg p-2">
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-slate-200 text-sm">🔶 {{ manchon.nom_reference || 'Manchon sans nom' }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full"
                          :class="manchon.etat === 'BON' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'">
                      {{ manchon.etat || 'Inconnu' }}
                    </span>
                  </div>
                  <div class="flex gap-2 mt-2">
                    <span class="text-xs text-slate-400 self-center mr-auto">{{ manchon.capacite_fibres }} fibres</span>
                    <button @click="emit('voirSoudures', manchon.id, manchon.nom_reference ?? undefined, manchon.etat === 'ATTENTE')"
                            class="text-xs bg-amber-700 hover:bg-amber-600 text-white font-bold py-1 px-2 rounded transition-colors">
                      🔍 Soudures
                    </button>
                    <button @click="emit('supprimerManchon', manchon.id, manchon.nom_reference ?? manchon.id)"
                            class="text-xs bg-red-950 hover:bg-red-900 text-red-400 font-bold py-1 px-2 rounded border border-red-800 transition-colors">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-slate-500 italic">Aucun manchon installé</p>
            </div>

            <button @click="emit('ajouterManchon', noeud.id)"
                    class="w-full bg-amber-900 hover:bg-amber-800 text-amber-300 text-xs font-bold py-2 px-4 rounded border border-amber-700 transition-colors">
              ➕ Ajouter un manchon
            </button>
          </template>

          <!-- MANCHON_ENTERRE / MANCHON_AERIEN -->
          <template v-else-if="['MANCHON_ENTERRE','MANCHON_AERIEN'].includes(noeud.type_noeud)">
            <div class="bg-[#252c3d] rounded-lg p-3 mb-4 border border-[#3a4257]">
              <p class="text-xs text-slate-400 flex items-center gap-2">
                <span>{{ noeud.type_noeud === 'MANCHON_ENTERRE' ? '🔽' : '🔼' }}</span>
                Manchon autonome — la matrice de soudures est accessible via le bouton ci-dessous.
              </p>
            </div>
            <button @click="emit('voirSouduresNoeud', noeud.id, noeud.nom_code ?? undefined)"
                    class="w-full bg-[#3a4257] hover:bg-[#4a5568] text-slate-200 text-xs font-bold py-2 px-4 rounded transition-colors">
              🔍 Voir la matrice de soudures complète
            </button>
          </template>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="noeud && !chargement" class="p-3 border-t border-[#2d3448] bg-[#252c3d] flex gap-2" @mousedown.stop>
        <button @mousedown.stop @click.stop="emit('modifierNoeud', noeud.id)"
                class="flex-1 text-xs font-bold py-1.5 px-3 rounded border transition
                       text-blue-300 bg-blue-950 border-blue-800 hover:bg-blue-900">
          ✏️ Modifier
        </button>
        <button @mousedown.stop @click.stop="emit('supprimerNoeud', noeud.id, noeud.nom_code ?? noeud.id)"
                class="flex-1 text-xs font-bold py-1.5 px-3 rounded border transition
                       text-red-400 bg-red-950 border-red-800 hover:bg-red-900">
          🗑 Supprimer
        </button>
      </div>
    </div>
  </transition>
</template>
