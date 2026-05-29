<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { ResultatTrace } from '../../composables/useTracage'
import type { NomFenetre } from '../../composables/useDrag'

const props = defineProps<{
  visible: boolean
  position: { x: number; y: number }
  resultat: ResultatTrace | null
  chargement: boolean
  erreur: string | null
}>()

const emit = defineEmits<{
  close: []
  'start-drag': [event: MouseEvent, fenetre: NomFenetre]
  'sauvegarder-observation': [soudureId: string, observation: string]
}>()

const editionId = ref<string | null>(null)
const brouillon = reactive<Record<string, string>>({})

const editer = (soudureId: string, valeur: string) => {
  brouillon[soudureId] = valeur
  editionId.value = soudureId
}
const valider = (soudureId: string) => {
  emit('sauvegarder-observation', soudureId, brouillon[soudureId] ?? '')
  editionId.value = null
}

const couleurStatut = (s?: string) => ({
  CONTINU: 'bg-emerald-900 text-emerald-300 border-emerald-700',
  SWAPPE: 'bg-amber-900 text-amber-300 border-amber-700',
  CASSE: 'bg-red-900 text-red-300 border-red-700',
  ATTENUATION: 'bg-orange-900 text-orange-300 border-orange-700',
  EN_ATTENTE: 'bg-slate-700 text-slate-300 border-slate-600',
}[s ?? ''] ?? 'bg-slate-700 text-slate-300 border-slate-600')

const estCroise = (a?: { numero: number } | null, b?: { numero: number } | null) =>
  !!a && !!b && a.numero !== b.numero
</script>

<template>
  <transition
    enter-active-class="transition-transform duration-200 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100">
    <div v-if="visible"
         class="absolute z-[5500] bg-[#1e2433] rounded-xl shadow-2xl border border-[#2d3448] flex flex-col overflow-hidden"
         style="width: 460px; max-height: 85vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- HEADER -->
      <div @mousedown.stop.prevent="emit('start-drag', $event, 'tracage')"
           class="px-4 py-3 cursor-move flex justify-between items-center select-none bg-sky-800 border-b border-sky-900">
        <h3 class="font-bold text-sm text-white flex items-center gap-2">
          🔍 Traçage du brin
          <span v-if="resultat" class="font-normal text-sky-200">— {{ resultat.fibre_depart.label }}</span>
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-sky-200 hover:text-white text-xl font-bold leading-none p-1">&times;</button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <!-- Chargement -->
        <div v-if="chargement" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-sky-500 border-t-transparent"></div>
        </div>

        <!-- Erreur -->
        <div v-else-if="erreur" class="text-center py-6">
          <p class="text-3xl mb-2">⚠️</p>
          <p class="text-sm text-red-400">{{ erreur }}</p>
        </div>

        <!-- Résultat -->
        <div v-else-if="resultat">
          <!-- Résumé -->
          <div class="mb-4 rounded-lg p-3 border text-center font-bold text-sm"
               :class="resultat.continu ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                       : resultat.cassure ? 'bg-red-950 border-red-800 text-red-300'
                       : 'bg-amber-950 border-amber-800 text-amber-300'">
            {{ resultat.resume }}
          </div>

          <!-- Extrémités -->
          <div class="flex items-center justify-between gap-2 mb-4 text-xs">
            <div class="flex-1 bg-[#252c3d] rounded-lg p-2 border border-[#3a4257] text-center">
              <p class="text-[10px] text-slate-500 uppercase">Départ</p>
              <p class="font-bold text-slate-200 truncate">{{ resultat.extremite_depart?.nom ?? '—' }}</p>
              <p class="text-[10px] text-slate-500">{{ resultat.extremite_depart?.type_label ?? 'extrémité libre' }}</p>
            </div>
            <span class="text-sky-400 text-lg">→</span>
            <div class="flex-1 bg-[#252c3d] rounded-lg p-2 border border-[#3a4257] text-center">
              <p class="text-[10px] text-slate-500 uppercase">Arrivée</p>
              <p class="font-bold text-slate-200 truncate">{{ resultat.extremite_arrivee?.nom ?? '—' }}</p>
              <p class="text-[10px] text-slate-500">{{ resultat.extremite_arrivee?.type_label ?? 'extrémité libre' }}</p>
            </div>
          </div>

          <!-- Timeline -->
          <div class="space-y-1.5">
            <template v-for="(etape, i) in resultat.chemin" :key="i">
              <!-- CABLE -->
              <div v-if="etape.type === 'CABLE'"
                   class="flex items-center gap-2 text-xs bg-[#252c3d] border border-[#3a4257] rounded px-3 py-1.5">
                <span>📡</span>
                <span class="font-bold text-slate-200">{{ etape.nom }}</span>
                <span class="text-slate-400">{{ etape.brin }}</span>
                <span class="text-slate-500 ml-auto">{{ etape.longueur }}</span>
                <span v-if="etape.source_longueur === 'calcul_geometrique'"
                      class="text-[10px] text-amber-500" title="Longueur estimée">⚠️</span>
              </div>

              <!-- SOUDURE -->
              <div v-else-if="etape.type === 'SOUDURE'"
                   class="bg-[#1a1f2e] border border-[#3a4257] rounded px-3 py-2">
                <div class="flex items-center gap-2 text-xs">
                  <span>🔗</span>
                  <span class="text-slate-400">{{ etape.lieu }}</span>
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] border ml-auto"
                        :class="couleurStatut(etape.statut)">{{ etape.statut_label || etape.statut }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs mt-1.5 text-slate-300">
                  <span class="font-mono">{{ etape.fibre_a?.label ?? '?' }}</span>
                  <span :class="estCroise(etape.fibre_a, etape.fibre_b) ? 'text-amber-400' : 'text-emerald-400'">↔</span>
                  <span class="font-mono">{{ etape.fibre_b?.label ?? '?' }}</span>
                </div>

                <!-- Zone observation technicien -->
                <div class="mt-2">
                  <template v-if="editionId === etape.soudure_id">
                    <textarea v-model="brouillon[etape.soudure_id!]" rows="2"
                              class="w-full text-xs bg-[#252c3d] border border-sky-700 text-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-sky-500"
                              placeholder="Observation du technicien…"></textarea>
                    <div class="flex gap-1.5 mt-1 justify-end">
                      <button @click="editionId = null"
                              class="text-[10px] px-2 py-0.5 text-slate-400 hover:text-slate-200">Annuler</button>
                      <button @click="valider(etape.soudure_id!)"
                              class="text-[10px] px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded">💾 Enregistrer</button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="flex items-start gap-2 text-[11px] text-slate-400 group cursor-pointer"
                         @click="editer(etape.soudure_id!, etape.observation ?? '')">
                      <span>📝</span>
                      <span class="flex-1 italic" :class="{ 'text-slate-600': !etape.observation }">
                        {{ etape.observation || 'Ajouter une observation…' }}
                      </span>
                      <span class="opacity-0 group-hover:opacity-100 text-sky-400 text-[10px]">✏️</span>
                    </div>
                  </template>
                </div>
              </div>

              <!-- TERMINAISONS -->
              <div v-else
                   class="flex items-center gap-2 text-xs rounded px-3 py-1.5 border"
                   :class="etape.statut === 'CASSE' || etape.type === 'FIN_FRONTIERE'
                           ? 'bg-red-950 border-red-800 text-red-300'
                           : 'bg-[#252c3d] border-[#3a4257] text-slate-300'">
                <span>🏁</span>
                <span>{{ etape.message }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>