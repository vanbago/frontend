<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import type { ResultatTrace, EtapeTrace } from '../../composables/useTracage'
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

// — Édition des observations : INDÉPENDANTE du tableau de trace —
const editionId = ref<string | null>(null)
const brouillon = reactive<Record<string, string>>({})

const ouvrirEdition = (soudureId: string, valeur: string) => {
  brouillon[soudureId] = valeur
  editionId.value = soudureId
}
const validerEdition = (soudureId: string) => {
  emit('sauvegarder-observation', soudureId, brouillon[soudureId] ?? '')
  editionId.value = null
}

// On isole les soudures pour la zone d'observations (découplée de la trace)
const soudures = computed<EtapeTrace[]>(() =>
  props.resultat?.chemin.filter(e => e.type === 'SOUDURE' && e.soudure_id) ?? []
)

const couleurStatut = (s?: string) => ({
  CONTINU: 'bg-emerald-900 text-emerald-300 border-emerald-700',
  SWAPPE: 'bg-amber-900 text-amber-300 border-amber-700',
  CASSE: 'bg-red-900 text-red-300 border-red-700',
  ATTENUATION: 'bg-orange-900 text-orange-300 border-orange-700',
  EN_ATTENTE: 'bg-slate-700 text-slate-300 border-slate-600',
}[s ?? ''] ?? 'bg-slate-700 text-slate-300 border-slate-600')

const badge = (e: EtapeTrace) => {
  if (e.statut === 'CASSE') return { label: 'Cassé', cls: couleurStatut('CASSE') }
  if (e.est_swap || e.statut === 'SWAPPE') return { label: 'Swappé', cls: couleurStatut('SWAPPE') }
  return { label: e.statut_label || e.statut, cls: couleurStatut(e.statut) }
}

const iconeType = (t: string) => ({
  CABLE: '📡', SOUDURE: '🔗', FIN: '🏁', FIN_ODF: '🔌', FIN_FRONTIERE: '🏁', ERREUR: '⚠️',
}[t] ?? '•')

const estTerminaison = (t: string) =>
  t === 'FIN' || t === 'FIN_ODF' || t === 'FIN_FRONTIERE' || t === 'ERREUR'

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
         style="width: 520px; max-height: 85vh;"
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
          <div class="mb-3 rounded-lg p-3 border text-center font-bold text-sm"
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

          <!-- TABLEAU DE TRACE (lecture seule) -->
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="text-[10px] uppercase text-slate-500 border-b border-[#3a4257]">
                <th class="w-6 py-1.5 px-2"></th>
                <th class="text-left py-1.5 px-2">Élément</th>
                <th class="text-left py-1.5 px-2">Détail</th>
                <th class="text-center py-1.5 px-2">Statut</th>
                <th class="text-right py-1.5 px-2">dB</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(etape, i) in resultat.chemin" :key="i"
                  class="border-b border-[#252c3d]"
                  :class="etape.statut === 'CASSE' || etape.type === 'FIN_FRONTIERE' ? 'bg-red-950/40' : ''">
                <td class="py-1.5 px-2 text-center">{{ iconeType(etape.type) }}</td>

                <!-- Terminaison : message sur toute la largeur -->
                <template v-if="estTerminaison(etape.type)">
                  <td colspan="4" class="py-1.5 px-2 text-slate-300">{{ etape.message }}</td>
                </template>

                <!-- Câble / Soudure : colonnes normales -->
                <template v-else>
                  <td class="py-1.5 px-2 font-bold text-slate-200">
                    {{ etape.type === 'CABLE' ? etape.nom : etape.lieu }}
                  </td>
                  <td class="py-1.5 px-2 text-slate-400">
                    <span v-if="etape.type === 'CABLE'">{{ etape.brin }} · {{ etape.longueur }}</span>
                    <span v-else class="font-mono">
                      {{ etape.fibre_a?.label ?? '?' }}
                      <span :class="estCroise(etape.fibre_a, etape.fibre_b) ? 'text-amber-400' : 'text-emerald-400'">↔</span>
                      {{ etape.fibre_b?.label ?? '?' }}
                    </span>
                  </td>
                  <td class="py-1.5 px-2 text-center">
                    <span v-if="etape.type === 'SOUDURE'"
                          class="px-1.5 py-0.5 rounded-full text-[10px] border"
                          :class="badge(etape).cls">{{ badge(etape).label }}</span>
                    <span v-else class="text-slate-600">—</span>
                  </td>
                  <td class="py-1.5 px-2 text-right text-slate-500">{{ etape.cumul_db ?? '' }}</td>
                </template>
              </tr>
            </tbody>
          </table>

          <!-- ZONE OBSERVATIONS : indépendante du tableau -->
          <div v-if="soudures.length" class="mt-5 border-t border-[#3a4257] pt-3">
            <p class="text-[10px] uppercase text-slate-500 mb-2">📝 Observations des soudures</p>
            <div v-for="s in soudures" :key="s.soudure_id"
                 class="mb-2 bg-[#1a1f2e] border border-[#3a4257] rounded p-2">
              <div class="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                <span>🔗</span><span>{{ s.lieu }}</span>
                <span class="font-mono ml-auto text-slate-500">{{ s.fibre_a?.label }} ↔ {{ s.fibre_b?.label }}</span>
              </div>
              <template v-if="editionId === s.soudure_id">
                <textarea v-model="brouillon[s.soudure_id!]" rows="2"
                          class="w-full text-xs bg-[#252c3d] border border-sky-700 text-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="Observation du technicien…"></textarea>
                <div class="flex gap-1.5 mt-1 justify-end">
                  <button @click="editionId = null"
                          class="text-[10px] px-2 py-0.5 text-slate-400 hover:text-slate-200">Annuler</button>
                  <button @click="validerEdition(s.soudure_id!)"
                          class="text-[10px] px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded">💾 Enregistrer</button>
                </div>
              </template>
              <template v-else>
                <div class="flex items-start gap-2 text-[11px] text-slate-400 group cursor-pointer"
                     @click="ouvrirEdition(s.soudure_id!, s.observation ?? '')">
                  <span class="flex-1 italic" :class="{ 'text-slate-600': !s.observation }">
                    {{ s.observation || 'Ajouter une observation…' }}
                  </span>
                  <span class="opacity-0 group-hover:opacity-100 text-sky-400 text-[10px]">✏️</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>