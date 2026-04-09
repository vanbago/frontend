<template>
  <div class="absolute bottom-6 left-4 z-[1000] rounded-xl shadow-xl p-3 text-xs border"
       style="background:#1e2433cc; backdrop-filter:blur(8px); border-color:#3a4257">
    <p class="font-bold mb-2 uppercase tracking-widest text-[10px]" style="color:#38bdf8">Légende</p>
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-2"><span class="inline-block w-4 h-4 rounded-full border-2 shadow" style="background:#ef4444; border-color:#1e2433"></span><span style="color:#cbd5e1">Centre de Transmission</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-full border-2 shadow" style="background:#06b6d4; border-color:#1e2433"></span><span style="color:#cbd5e1">Pylône / BTS</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-full border-2 shadow" style="background:#3b82f6; border-color:#1e2433"></span><span style="color:#cbd5e1">Chambre de Tirage</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full border-2 shadow" style="background:#f59e0b; border-color:#1e2433"></span><span style="color:#cbd5e1">Manchon</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full border-2 shadow" style="background:#78716c; border-color:#1e2433"></span><span style="color:#cbd5e1">Manchon Enterré</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full border-2 shadow" style="background:#a78bfa; border-color:#1e2433"></span><span style="color:#cbd5e1">Manchon Aérien</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-2 h-2 rounded-full border-2 shadow" style="background:#84cc16; border-color:#1e2433"></span><span style="color:#cbd5e1">Poteau</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-full border-2 shadow" style="background:#ec4899; border-color:#1e2433"></span><span style="color:#cbd5e1">Site Client</span></div>
      <hr class="my-0.5" style="border-color:#3a4257">
      <p class="font-bold uppercase tracking-widest text-[10px] mt-1 mb-1" style="color:#94a3b8">Câbles — capacité</p>
      <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#94a3b8"></span><span style="color:#cbd5e1">≤ 6 FO</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#22d3ee"></span><span style="color:#cbd5e1">≤ 12 FO</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#84cc16"></span><span style="color:#cbd5e1">≤ 24 FO</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#f59e0b"></span><span style="color:#cbd5e1">≤ 48 FO</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#f97316"></span><span style="color:#cbd5e1">≤ 72 FO</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#ef4444"></span><span style="color:#cbd5e1">≤ 96 FO</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#dc2626"></span><span style="color:#cbd5e1">≤ 144 FO</span></div>
      <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#a855f7"></span><span style="color:#cbd5e1">> 144 FO</span></div>
    </div>
  </div>
</template>
