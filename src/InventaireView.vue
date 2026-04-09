<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useReseauStore } from './stores/reseau'
import { couleurParCapacite } from './composables/useCables'

const store = useReseauStore()

// ============================================================
// ONGLETS
// ============================================================
type Onglet = 'cables' | 'noeuds'
const ongletActif = ref<Onglet>('cables')

// ============================================================
// FILTRES & RECHERCHE
// ============================================================

const rechercheCable = ref('')
const filtreStatutCable = ref('')

const rechercheNoeud = ref('')
const filtreTypeNoeud = ref('')

// ============================================================
// PAGINATION
// ============================================================

const PAGE_SIZE = 50

const pageCables = ref(1)
const pageNoeuds = ref(1)

// Remet la page à 1 quand les filtres changent
watch([rechercheCable, filtreStatutCable], () => { pageCables.value = 1 })
watch([rechercheNoeud, filtreTypeNoeud], () => { pageNoeuds.value = 1 })

// ============================================================
// DONNÉES FILTRÉES
// ============================================================

const cablesFiltres = computed(() => {
  return store.cables.filter(cable => {
    const correspondRecherche = !rechercheCable.value ||
      cable.nom_code?.toLowerCase().includes(rechercheCable.value.toLowerCase())
    const correspondStatut = !filtreStatutCable.value ||
      cable.statut_physique === filtreStatutCable.value
    return correspondRecherche && correspondStatut
  })
})

const noeudsFiltres = computed(() => {
  return store.noeuds.filter(noeud => {
    const correspondRecherche = !rechercheNoeud.value ||
      noeud.nom_code?.toLowerCase().includes(rechercheNoeud.value.toLowerCase())
    const correspondType = !filtreTypeNoeud.value ||
      noeud.type_noeud === filtreTypeNoeud.value
    return correspondRecherche && correspondType
  })
})

const cablesPage = computed(() => {
  const debut = (pageCables.value - 1) * PAGE_SIZE
  return cablesFiltres.value.slice(debut, debut + PAGE_SIZE)
})

const noeudPage = computed(() => {
  const debut = (pageNoeuds.value - 1) * PAGE_SIZE
  return noeudsFiltres.value.slice(debut, debut + PAGE_SIZE)
})

const totalPagesCables = computed(() => Math.max(1, Math.ceil(cablesFiltres.value.length / PAGE_SIZE)))
const totalPagesNoeuds = computed(() => Math.max(1, Math.ceil(noeudsFiltres.value.length / PAGE_SIZE)))

// ============================================================
// HELPERS D'AFFICHAGE
// ============================================================

const formaterLongueur = (metres: number | null | undefined) => {
  if (!metres) return 'N/A'
  return metres >= 1000
    ? (metres / 1000).toFixed(2) + ' km'
    : Number(metres).toFixed(0) + ' m'
}

const badgeStatutCable = (statut: string | null) => {
  switch (statut) {
    case 'EN_SERVICE':   return 'bg-emerald-100 text-emerald-700'
    case 'PROJET':       return 'bg-blue-100 text-blue-700'
    case 'HORS_SERVICE': return 'bg-red-100 text-red-700'
    default:             return 'bg-gray-100 text-gray-600'
  }
}

const badgeTypeNoeud = (type: string) => {
  const map: Record<string, string> = {
    CENTRE:          'bg-red-100 text-red-700',
    BTS:             'bg-cyan-100 text-cyan-700',
    CHAMBRE:         'bg-blue-100 text-blue-700',
    MANCHON:         'bg-amber-100 text-amber-700',
    MANCHON_ENTERRE: 'bg-stone-100 text-stone-700',
    MANCHON_AERIEN:  'bg-violet-100 text-violet-700',
    POTEAU:          'bg-lime-100 text-lime-700',
    CLIENT:          'bg-pink-100 text-pink-700',
  }
  return map[type] || 'bg-gray-100 text-gray-600'
}

const iconeNoeud = (type: string) => {
  const map: Record<string, string> = {
    CENTRE: '🏢', BTS: '📡', CHAMBRE: '⬛',
    MANCHON: '🔶', MANCHON_ENTERRE: '🔽',
    MANCHON_AERIEN: '🔼', POTEAU: '🪵', CLIENT: '🏠'
  }
  return map[type] || '🖧'
}

// ============================================================
// CHARGEMENT
// ============================================================
onMounted(async () => {
  if (store.cables.length === 0 || store.noeuds.length === 0) {
    await store.chargerInfrastructure()
  }
})
</script>

<template>
  <div class="min-h-screen font-sans text-xs" style="background:#eae7d6; color:#3a3d2e;">

    <!-- EN-TÊTE -->
    <header class="px-5 py-3 flex items-center justify-between border-b" style="background:#4a5240; border-color:#3a3d2e;">
      <div class="flex items-center gap-3">
        <router-link to="/" class="transition text-[11px]" style="color:#c8c4a0;" >
          ← Retour à la carte
        </router-link>
        <span style="color:#6b7c4a;">|</span>
        <h1 class="text-sm font-bold" style="color:#eae7d6;">📋 Inventaire du Réseau</h1>
      </div>
      <button
        @click="store.chargerInfrastructure()"
        class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition"
        style="background:#5c6b3a; color:#eae7d6; border:1px solid #6b7c4a;"
        :disabled="store.chargementCables || store.chargementNoeuds"
      >
        <span :class="{ 'animate-spin': store.chargementCables || store.chargementNoeuds }">🔄</span>
        Actualiser
      </button>
    </header>

    <main class="p-4 max-w-7xl mx-auto">

      <!-- STATISTIQUES -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div class="rounded-lg border p-3" style="background:#f5f2e4; border-color:#b8b49a;">
          <p class="text-[10px] font-bold uppercase tracking-wide mb-0.5" style="color:#6b7c4a;">Câbles</p>
          <p class="text-2xl font-black" style="color:#4a5240;">{{ store.totalCables }}</p>
          <p class="text-[10px]" style="color:#8a8a72;">sections enregistrées</p>
        </div>
        <div class="rounded-lg border p-3" style="background:#f5f2e4; border-color:#b8b49a;">
          <p class="text-[10px] font-bold uppercase tracking-wide mb-0.5" style="color:#6b7c4a;">Nœuds</p>
          <p class="text-2xl font-black" style="color:#4a5240;">{{ store.totalNoeuds }}</p>
          <p class="text-[10px]" style="color:#8a8a72;">points d'infrastructure</p>
        </div>
        <div class="rounded-lg border p-3" style="background:#f5f2e4; border-color:#b8b49a;">
          <p class="text-[10px] font-bold uppercase tracking-wide mb-0.5" style="color:#6b7c4a;">Capacité</p>
          <p class="text-2xl font-black" style="color:#4a5240;">{{ store.capaciteTotale.toLocaleString() }}</p>
          <p class="text-[10px]" style="color:#8a8a72;">fibres au total</p>
        </div>
        <div class="rounded-lg border p-3" style="background:#f5f2e4; border-color:#b8b49a;">
          <p class="text-[10px] font-bold uppercase tracking-wide mb-0.5" style="color:#6b7c4a;">Centres</p>
          <p class="text-2xl font-black" style="color:#4a5240;">{{ store.noeudsByType['CENTRE']?.length || 0 }}</p>
          <p class="text-[10px]" style="color:#8a8a72;">sites de transmission</p>
        </div>
      </div>

      <!-- ONGLETS -->
      <div class="flex gap-1 mb-3 border-b" style="border-color:#b8b49a;">
        <button
          @click="ongletActif = 'cables'"
          class="px-3 py-1.5 text-xs font-medium transition border-b-2 -mb-px"
          :style="ongletActif === 'cables'
            ? 'border-color:#6b7c4a; color:#4a5240;'
            : 'border-color:transparent; color:#8a8a72;'"
        >
          🔌 Câbles
          <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full" style="background:#d4cfb0; color:#4a5240;">
            {{ cablesFiltres.length }}
          </span>
        </button>
        <button
          @click="ongletActif = 'noeuds'"
          class="px-3 py-1.5 text-xs font-medium transition border-b-2 -mb-px"
          :style="ongletActif === 'noeuds'
            ? 'border-color:#6b7c4a; color:#4a5240;'
            : 'border-color:transparent; color:#8a8a72;'"
        >
          🖧 Nœuds
          <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full" style="background:#d4cfb0; color:#4a5240;">
            {{ noeudsFiltres.length }}
          </span>
        </button>
      </div>

      <!-- TABLEAU CÂBLES -->
      <div v-if="ongletActif === 'cables'" class="rounded-lg border overflow-hidden" style="background:#f5f2e4; border-color:#b8b49a;">
        <div class="p-3 border-b flex flex-wrap gap-2" style="border-color:#d4cfb0;">
          <input v-model="rechercheCable" type="text" placeholder="🔍 Rechercher un câble..."
                 class="flex-1 min-w-[180px] text-xs px-2.5 py-1.5 rounded-md outline-none"
                 style="border:1px solid #b8b49a; background:#eae7d6; color:#3a3d2e;"/>
          <select v-model="filtreStatutCable"
                  class="text-xs px-2.5 py-1.5 rounded-md outline-none"
                  style="border:1px solid #b8b49a; background:#eae7d6; color:#3a3d2e;">
            <option value="">Tous les statuts</option>
            <option value="EN_SERVICE">En service</option>
            <option value="PROJET">En projet</option>
            <option value="HORS_SERVICE">Hors service</option>
          </select>
        </div>

        <div v-if="store.chargementCables" class="py-12 text-center" style="color:#8a8a72;">
          <div class="animate-spin w-7 h-7 border-4 border-t-transparent rounded-full mx-auto mb-2" style="border-color:#6b7c4a; border-top-color:transparent;"></div>
          Chargement des câbles...
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b" style="background:#d4cfb0; border-color:#b8b49a;">
              <tr>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Nom / Code</th>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Capacité</th>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Longueur</th>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Technologie</th>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cable in cablesPage" :key="cable.id"
                  class="border-b transition-colors hover:brightness-95"
                  style="border-color:#dedad0;">
                <td class="px-3 py-2 font-medium" style="color:#3a3d2e;">{{ cable.nom_code || '—' }}</td>
                <td class="px-3 py-2">
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold" :style="{ background: couleurParCapacite(cable.capacite_fibres) + '33', color: couleurParCapacite(cable.capacite_fibres), border: '1px solid ' + couleurParCapacite(cable.capacite_fibres) + '88' }">
                    {{ cable.capacite_fibres ?? '—' }} FO
                  </span>
                </td>
                <td class="px-3 py-2" style="color:#5c5c48;">{{ formaterLongueur(cable.longueur_reelle_metres) }}</td>
                <td class="px-3 py-2" style="color:#5c5c48;">{{ cable.technologie_transport || '—' }}</td>
                <td class="px-3 py-2">
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium" :class="badgeStatutCable(cable.statut_physique)">
                    {{ cable.statut_physique || 'N/A' }}
                  </span>
                </td>
              </tr>
              <tr v-if="cablesFiltres.length === 0">
                <td colspan="5" class="px-3 py-10 text-center" style="color:#8a8a72;">
                  <p class="text-2xl mb-1">📭</p>
                  <p>Aucun câble ne correspond aux filtres</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination câbles -->
        <div v-if="totalPagesCables > 1" class="flex items-center justify-between px-3 py-2 border-t text-[11px]" style="border-color:#d4cfb0; color:#6b7c4a;">
          <span>Page {{ pageCables }} / {{ totalPagesCables }} — {{ cablesFiltres.length }} câbles</span>
          <div class="flex gap-1">
            <button @click="pageCables--" :disabled="pageCables <= 1"
              class="px-2.5 py-0.5 rounded disabled:opacity-40"
              style="border:1px solid #b8b49a; background:#dedad0;">‹</button>
            <button @click="pageCables++" :disabled="pageCables >= totalPagesCables"
              class="px-2.5 py-0.5 rounded disabled:opacity-40"
              style="border:1px solid #b8b49a; background:#dedad0;">›</button>
          </div>
        </div>
      </div>

      <!-- TABLEAU NŒUDS -->
      <div v-if="ongletActif === 'noeuds'" class="rounded-lg border overflow-hidden" style="background:#f5f2e4; border-color:#b8b49a;">
        <div class="p-3 border-b flex flex-wrap gap-2" style="border-color:#d4cfb0;">
          <input v-model="rechercheNoeud" type="text" placeholder="🔍 Rechercher un nœud..."
                 class="flex-1 min-w-[180px] text-xs px-2.5 py-1.5 rounded-md outline-none"
                 style="border:1px solid #b8b49a; background:#eae7d6; color:#3a3d2e;"/>
          <select v-model="filtreTypeNoeud"
                  class="text-xs px-2.5 py-1.5 rounded-md outline-none"
                  style="border:1px solid #b8b49a; background:#eae7d6; color:#3a3d2e;">
            <option value="">Tous les types</option>
            <option value="CENTRE">Centre de Transmission</option>
            <option value="CHAMBRE">Chambre de Tirage</option>
            <option value="MANCHON">Manchon</option>
            <option value="MANCHON_ENTERRE">Manchon Enterré</option>
            <option value="MANCHON_AERIEN">Manchon Aérien</option>
            <option value="POTEAU">Poteau</option>
            <option value="BTS">Pylône / BTS</option>
            <option value="CLIENT">Site Client</option>
          </select>
        </div>

        <div v-if="store.chargementNoeuds" class="py-12 text-center" style="color:#8a8a72;">
          <div class="animate-spin w-7 h-7 border-4 border-t-transparent rounded-full mx-auto mb-2" style="border-color:#6b7c4a; border-top-color:transparent;"></div>
          Chargement des nœuds...
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b" style="background:#d4cfb0; border-color:#b8b49a;">
              <tr>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Nom / Code</th>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Type</th>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">État Opérationnel</th>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Énergie</th>
                <th class="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style="color:#5c6b3a;">Dernière modif.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="noeud in noeudPage" :key="noeud.id"
                  class="border-b transition-colors hover:brightness-95"
                  style="border-color:#dedad0;">
                <td class="px-3 py-2 font-medium flex items-center gap-1.5" style="color:#3a3d2e;">
                  <span>{{ iconeNoeud(noeud.type_noeud) }}</span>
                  {{ noeud.nom_code || '—' }}
                </td>
                <td class="px-3 py-2">
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium" :class="badgeTypeNoeud(noeud.type_noeud)">
                    {{ noeud.type_noeud_label || noeud.type_noeud }}
                  </span>
                </td>
                <td class="px-3 py-2" style="color:#5c5c48;">{{ noeud.statut_operationnel || '—' }}</td>
                <td class="px-3 py-2" style="color:#5c5c48;">{{ noeud.statut_energie || '—' }}</td>
                <td class="px-3 py-2 text-[10px]" style="color:#8a8a72;">{{ noeud.date_modification?.split('T')[0] || '—' }}</td>
              </tr>
              <tr v-if="noeudsFiltres.length === 0">
                <td colspan="5" class="px-3 py-10 text-center" style="color:#8a8a72;">
                  <p class="text-2xl mb-1">📭</p>
                  <p>Aucun nœud ne correspond aux filtres</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination nœuds -->
        <div v-if="totalPagesNoeuds > 1" class="flex items-center justify-between px-3 py-2 border-t text-[11px]" style="border-color:#d4cfb0; color:#6b7c4a;">
          <span>Page {{ pageNoeuds }} / {{ totalPagesNoeuds }} — {{ noeudsFiltres.length }} nœuds</span>
          <div class="flex gap-1">
            <button @click="pageNoeuds--" :disabled="pageNoeuds <= 1"
              class="px-2.5 py-0.5 rounded disabled:opacity-40"
              style="border:1px solid #b8b49a; background:#dedad0;">‹</button>
            <button @click="pageNoeuds++" :disabled="pageNoeuds >= totalPagesNoeuds"
              class="px-2.5 py-0.5 rounded disabled:opacity-40"
              style="border:1px solid #b8b49a; background:#dedad0;">›</button>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>
