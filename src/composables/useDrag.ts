import { reactive, onMounted, onUnmounted } from 'vue'

export type NomFenetre = 'monitoring' | 'creation' | 'inspection' | 'inspectionNoeud' | 'matrice' | 'creationCable' | 'ajouterManchon' | 'creationOdf' | 'inspectionOdf' | 'pickerFibre'|'tracage'
// ─── Constantes de bornage ─────────────────────────────────────────
// HEADER_HEIGHT correspond à la classe Tailwind `h-14` du <header>.
// Si tu changes la hauteur du header dans MapView.vue, ajuste ici.
const HEADER_HEIGHT = 56

// MARGE_VISIBILITE = nombre de pixels minimum d'une fenêtre qui doivent
// rester visibles dans le viewport. Permet à l'utilisateur de toujours
// "rattraper" sa fenêtre par sa barre de titre.
const MARGE_VISIBILITE = 80
// ───────────────────────────────────────────────────────────────────

export function useDrag() {
  const fenetres = reactive({
    monitoring:      { x: 20, y: 80 },
    creation:        { x: window.innerWidth > 800 ? window.innerWidth - 360 : 20, y: 80 },
    inspection:      { x: 60, y: 100 },
    inspectionNoeud: { x: 60, y: 100 },
    matrice:         { x: 100, y: 80 },
    creationCable:   { x: window.innerWidth > 800 ? window.innerWidth - 380 : 20, y: 80 },
    ajouterManchon:  { x: 380, y: 85 },
    creationOdf:     { x: window.innerWidth > 800 ? window.innerWidth - 360 : 20, y: 80 },
    inspectionOdf:   { x: window.innerWidth > 800 ? window.innerWidth - 480 : 20, y: 80 },
    pickerFibre:     { x: window.innerWidth > 800 ? window.innerWidth - 340 : 20, y: 80 },
    tracage:         {x:120, y:90}
  })

  /**
   * Borne une position (x, y) pour qu'elle reste atteignable par l'utilisateur.
   * - x : entre 0 et (largeur viewport - MARGE_VISIBILITE)
   * - y : entre 0 et (hauteur viewport - HEADER_HEIGHT - MARGE_VISIBILITE)
   *
   * Note : x et y sont relatifs à <main>, qui commence sous le header.
   * Donc y=0 = juste sous le header (déjà sûr).
   */
  const clampPosition = (x: number, y: number) => {
    const xMax = window.innerWidth - MARGE_VISIBILITE
    const yMax = window.innerHeight - HEADER_HEIGHT - MARGE_VISIBILITE
    return {
      x: Math.max(0, Math.min(xMax, x)),
      y: Math.max(0, Math.min(yMax, y)),
    }
  }

  let dragInfo = {
    actif: false,
    fenetre: '' as NomFenetre,
    startX: 0, startY: 0,
    initX: 0, initY: 0
  }

  const glisserFenetre = (e: MouseEvent) => {
    if (!dragInfo.actif) return
    const nouveauX = dragInfo.initX + (e.clientX - dragInfo.startX)
    const nouveauY = dragInfo.initY + (e.clientY - dragInfo.startY)
    const { x, y } = clampPosition(nouveauX, nouveauY)
    fenetres[dragInfo.fenetre].x = x
    fenetres[dragInfo.fenetre].y = y
  }

  const arreterDrag = () => {
    dragInfo.actif = false
    document.removeEventListener('mousemove', glisserFenetre)
    document.removeEventListener('mouseup', arreterDrag)
  }

  const demarrerDrag = (e: MouseEvent, nomFenetre: NomFenetre) => {
    dragInfo = {
      actif: true,
      fenetre: nomFenetre,
      startX: e.clientX,
      startY: e.clientY,
      initX: fenetres[nomFenetre].x,
      initY: fenetres[nomFenetre].y
    }
    document.addEventListener('mousemove', glisserFenetre)
    document.addEventListener('mouseup', arreterDrag)
  }

  /**
   * Recalcule toutes les positions de fenêtres après un redimensionnement
   * du viewport. Évite qu'une fenêtre disparaisse quand l'utilisateur
   * rétrécit la fenêtre du navigateur.
   */
  const recentrerFenetres = () => {
    (Object.keys(fenetres) as NomFenetre[]).forEach(nom => {
      const { x, y } = clampPosition(fenetres[nom].x, fenetres[nom].y)
      fenetres[nom].x = x
      fenetres[nom].y = y
    })
  }

  // Écoute le resize du navigateur pour rebornage automatique
  onMounted(() => {
    window.addEventListener('resize', recentrerFenetres)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', recentrerFenetres)
  })

  return { fenetres, demarrerDrag }
}