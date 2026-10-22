import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PDFDocument, StandardFonts, rgb, PageSizes, BlendMode } from 'pdf-lib'
import download from 'downloadjs'
import logo from '../assets/logo.png'
import { leerDatos, descargaBuffer } from '@/shared/services/apiService'
import { useTenantStore } from '@/stores/tenantStore'

export const useBoletatxt = defineStore('boletatxt', () => {
  const cab = ref({})
  const det = ref([])
  const idliq = ref(0)
  const error = ref(null)

  /**
   * Descarga el logo de la boleta a través de la fachada de dominio.
   *
   * @param {string} url ruta o URL del recurso
   * @returns {Promise<ArrayBuffer>}
   */
  async function descargarImagen(url) {
    const res = await descargaBuffer(url)
    if (!res.operacionOk || !res.datos) {
      throw new Error(res.errmsg || 'No se pudo descargar la imagen del logo')
    }
    return res.datos
  }

  async function setId(id) {
    idliq.value = id
    error.value = null

    try {
      const resCab = await leerDatos('view/boletaCabPie', { query: { IdLiq: idliq.value } })
      if (!resCab.operacionOk) {
        throw new Error(resCab.errmsg || `Error ${resCab.estado} al obtener la cabecera`)
      }
      cab.value = resCab.datos

      const resDet = await leerDatos('view/boletaDetalle', { query: { IdLiq: idliq.value } })
      if (!resDet.operacionOk) {
        throw new Error(resDet.errmsg || `Error ${resDet.estado} al obtener el detalle`)
      }
      det.value = resDet.datos
    } catch (err) {
      // El error queda disponible en el store en lugar de perderse en la consola.
      error.value = err instanceof Error ? err.message : String(err)
      cab.value = {}
      det.value = []
      throw err
    }
  }

  async function createPdf() {
    let cadenacab = ''
    let cadenapie = ''
    let cadenaley = ''
    let idLiq = 0

    if (cab.value.length === 1 && cab.value.length > 0) {
      const line = cab.value[0]

      cadenacab += line['C1'] + '\n'
      cadenacab += line['C2'] + '\n'
      cadenacab += line['C3'] + '\n'
      cadenacab += line['C4'] + '\n'
      cadenacab += line['C5'] + '\n'

      idLiq = line['IDLIQ']
      cadenapie += 'Sup. Gobierno de Tucumán  30-67542808-1' + '\n'
    }

    let cadenadet =
      'Cod Subcod  Descripción                      Cant        Vto            Haberes         Retenciones\n\n'

    let hab = 0
    let ret = 0

    if (det.value && det.value.length > 0) {
      det.value.forEach((element) => {
        if (element['ESLEY'] == 1) {
          cadenaley += element['CADENA'].replace('  0.00', '      ') + '\n'
        } else {
          cadenadet += element['CADENA'].replace('  0.00', '      ') + '\n'
          hab += element['HABERES']
          ret += element['RETENCIONES']
        }
      })

      cadenadet +=  '\n' + cadenaley

      const liquid = hab - ret

      cadenapie += Number.parseFloat(hab).toFixed(2).toLocaleString().padStart(79)
      cadenapie += Number.parseFloat(ret).toFixed(2).toLocaleString().padStart(19) + '\n\n'
      cadenapie += 'LIQUIDO: '.toString().padStart(79) + Number.parseFloat(liquid).toFixed(2).toLocaleString().padStart(19) + '\n'

      cadenapie += '\nRECIBO NRO: '.padStart(77) + idLiq

      const textCab = cadenacab.toString().split('\n')
      const textDet = cadenadet.toString().split('\n')
      const textPie = cadenapie.toString().split('\n')

      const pdfDoc = await PDFDocument.create()
      const fontCur = await pdfDoc.embedFont(StandardFonts.Courier)
      const fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold)

      const page = pdfDoc.addPage(PageSizes.A4)
      const { width, height } = page.getSize()

      // Image
      const tenantStore = useTenantStore()
      const pngUrl = tenantStore.boletaLogo || logo

      const pngImageBytes = await descargarImagen(pngUrl)

      const pngImage = await pdfDoc.embedPng(pngImageBytes)

      const pngDims = pngImage.scale(0.2)

      page.drawImage(pngImage, {
        x: page.getWidth() / 2 - pngDims.width / 2,
        y: (page.getHeight() - 20) / 2 - pngDims.height / 2 + 145,
        width: pngDims.width,
        height: pngDims.height,
        opacity: 0.2,
        blendMode: BlendMode.SoftLight
      })

      let fontSize = 9
      let font = fontCur

      let xpos = 30
      let ypos = 25
      let tempHeight = height
      font = fontBold

      for (let index = 0; index < textCab.length; index++) {
        const element = textCab[index]

        ypos = tempHeight - 25 - index * fontSize

        page.drawText(element, {
          x: xpos,
          y: ypos,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0)
        })
      }

      page.drawLine({
        start: { x: xpos, y: ypos },
        end: { x: width - xpos, y: ypos },
        thickness: 1,
        //color: rgb(0.75, 0.2, 0.2),
        opacity: 0.5
      })

      tempHeight = ypos

      for (let index = 0; index < textDet.length; index++) {
        const element = textDet[index]

        font = fontCur
        ypos = tempHeight - index - 25 - index * fontSize

        page.drawText(element, {
          x: xpos,
          y: ypos,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0)
        })
      }

      tempHeight = ypos

      for (let index = 0; index < 40 - textDet.length; index++) {
        ypos = tempHeight - index - 25 - index * fontSize
      }

      page.drawLine({
        start: { x: xpos, y: ypos },
        end: { x: width - xpos, y: ypos },
        thickness: 1,
        //color: rgb(0.75, 0.2, 0.2),
        opacity: 0.5
      })

      tempHeight = ypos

      for (let index = 0; index < textPie.length; index++) {
        const element = textPie[index]

        font = fontCur
        ypos = tempHeight - index - 25 - index * fontSize

        page.drawText(element, {
          x: xpos,
          y: ypos,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0)
        })
      }

      tempHeight = ypos

      const pdfBytes = await pdfDoc.save()
      download(pdfBytes, cab.value[0]['FILENAME'], 'application/pdf')
    }
  }
  return { setId, cab, det, error, createPdf }
})
