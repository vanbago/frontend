<template>
  <div class="min-h-screen bg-gray-100 p-6 font-sans">
    
    <header class="mb-8 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        🖥️ Centre de Monitoring Optis_OTN
      </h1>
      <div class="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-200">
         <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span class="text-sm font-bold text-emerald-700">Connexion Active (JWT)</span>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500 transition-all hover:shadow-md">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Processeur (CPU)</p>
            <h3 class="text-3xl font-black text-gray-800 mt-1">{{ metrics.cpu?.percent || 0 }}<span class="text-lg text-gray-500">%</span></h3>
          </div>
          <div class="p-2 bg-blue-50 rounded-lg text-blue-500">⚙️</div>
        </div>
        <p class="text-xs text-gray-500 mt-4 font-medium">{{ metrics.cpu?.count || 0 }} Cœurs logiques actifs</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-emerald-500 transition-all hover:shadow-md">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Mémoire Vive (RAM)</p>
            <h3 class="text-3xl font-black text-gray-800 mt-1">{{ metrics.memory?.percent || 0 }}<span class="text-lg text-gray-500">%</span></h3>
          </div>
          <div class="p-2 bg-emerald-50 rounded-lg text-emerald-500">🧠</div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-4">
          <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" :style="{ width: `${metrics.memory?.percent || 0}%` }"></div>
        </div>
        <p class="text-xs text-gray-500 mt-2 font-medium">
          {{ metrics.memory?.used_mb || 0 }} MB / {{ metrics.memory?.total_mb || 0 }} MB
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500 transition-all hover:shadow-md">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Stockage Serveur</p>
            <h3 class="text-3xl font-black text-gray-800 mt-1">{{ metrics.disk?.percent || 0 }}<span class="text-lg text-gray-500">%</span></h3>
          </div>
          <div class="p-2 bg-purple-50 rounded-lg text-purple-500">💾</div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-4">
          <div class="bg-purple-500 h-1.5 rounded-full transition-all duration-500" :style="{ width: `${metrics.disk?.percent || 0}%` }"></div>
        </div>
        <p class="text-xs text-gray-500 mt-2 font-medium">
          {{ metrics.disk?.used_gb || 0 }} GB / {{ metrics.disk?.total_gb || 0 }} GB
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 transition-all hover:shadow-md" :class="latencyStatus(metrics.latency_ms).borderClass">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Latence API</p>
            <h3 class="text-3xl font-black text-gray-800 mt-1">{{ metrics.latency_ms || 0 }}<span class="text-lg text-gray-500">ms</span></h3>
          </div>
          <div class="p-2 rounded-lg" :class="latencyStatus(metrics.latency_ms).bgClass">📡</div>
        </div>
        <p class="text-xs mt-4 font-bold" :class="latencyStatus(metrics.latency_ms).textClass">
          Statut : {{ latencyStatus(metrics.latency_ms).label }}
        </p>
      </div>

    </div>

    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 class="text-lg font-bold text-gray-800 mb-4">Historique de Charge CPU (Temps Réel)</h3>
      <div class="h-80 w-full relative">
        <canvas ref="cpuChart"></canvas>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Chart, registerables } from 'chart.js';
import AuthService from '../services/auth';

Chart.register(...registerables);
const BASE_URL = AuthService.getBaseURL();

interface Metrics {
  cpu?: { percent: number; count: number };
  memory?: { percent: number; used_mb: number; total_mb: number };
  disk?: { percent: number; used_gb: number; total_gb: number };
  latency_ms?: number;
}

const metrics = ref<Metrics>({});
// Le lien avec le <canvas> dans le template !
const cpuChart = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;
let intervalId: number;

const cpuHistory = ref<number[]>([]);
const timeLabels = ref<string[]>([]);

// Fonction pour déterminer la couleur de la latence
const latencyStatus = (ms: number | undefined) => {
  if (ms === undefined) return { label: 'En attente...', textClass: 'text-gray-500', borderClass: 'border-gray-500', bgClass: 'bg-gray-100 text-gray-500' };
  if (ms < 50) return { label: 'Excellent', textClass: 'text-emerald-600', borderClass: 'border-emerald-500', bgClass: 'bg-emerald-50 text-emerald-500' };
  if (ms < 150) return { label: 'Correct', textClass: 'text-yellow-600', borderClass: 'border-yellow-500', bgClass: 'bg-yellow-50 text-yellow-500' };
  return { label: 'Critique', textClass: 'text-red-600', borderClass: 'border-red-500', bgClass: 'bg-red-50 text-red-500' };
};

function initChart() {
  if (cpuChart.value) {
    chart = new Chart(cpuChart.value, {
      type: 'line',
      data: {
        labels: [...timeLabels.value],
        datasets: [{
          label: 'Charge CPU (%)',
          data: [...cpuHistory.value],
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }
}

function updateChart() {
  if (chart) {
    chart.data.labels = [...timeLabels.value];
    chart.data.datasets[0].data = [...cpuHistory.value];
    chart.update();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function fetchMetrics() {
  try {
    const response = await AuthService.apiCall(`${BASE_URL}/api/monitoring/metrics/`);

    if (response.status === 401) {
      console.warn("⚠️ Token expiré ou invalide, arrêt du polling")
      clearInterval(intervalId)  // Stopper le polling
      return
    }
    
    if (!response.ok) throw new Error(`Erreur ${response.status}`);

    const data = await response.json();
    metrics.value = data;
    
    cpuHistory.value.push(data.cpu?.percent || 0);
    const now = new Date();
    timeLabels.value.push(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit', second:'2-digit' }));
    
    // Garde les 20 dernières secondes sur le graphique
    if (cpuHistory.value.length > 20) {
      cpuHistory.value.shift();
      timeLabels.value.shift();
    }
    
    updateChart();
  } catch (error) {
    console.error('❌ Erreur fetch metrics:', error);
  }
}

onMounted(() => {
  initChart();
  fetchMetrics();
  intervalId = window.setInterval(fetchMetrics, 5000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
  chart?.destroy();
});
</script>