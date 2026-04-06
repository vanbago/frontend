import { reactive } from 'vue'

export type NomFenetre = 'monitoring' | 'creation' | 'inspection' | 'inspectionNoeud' | 'matrice' | 'creationCable'| 'ajouterManchon'

export function useDrag() {
  const fenetres = reactive({
    monitoring:      { x: 20, y: 80 },
    creation:        { x: window.innerWidth > 800 ? window.innerWidth - 360 : 20, y: 80 },
    inspection:      { x: 60, y: 100 },
    inspectionNoeud: { x: 60, y: 100 },
    matrice:         { x: 100, y: 80 },
    creationCable:   { x: window.innerWidth > 800 ? window.innerWidth - 380 : 20, y: 80 },
    ajouterManchon : {x:380, y:85}
  })

  let dragInfo = {
    actif: false,
    fenetre: '' as NomFenetre,
    startX: 0, startY: 0,
    initX: 0, initY: 0
  }

  const glisserFenetre = (e: MouseEvent) => {
    if (!dragInfo.actif) return
    fenetres[dragInfo.fenetre].x = dragInfo.initX + (e.clientX - dragInfo.startX)
    fenetres[dragInfo.fenetre].y = dragInfo.initY + (e.clientY - dragInfo.startY)
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

  return { fenetres, demarrerDrag }
}
