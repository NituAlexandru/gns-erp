import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS } from '../../config/styles'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'

const styles = StyleSheet.create({
  footerContainer: {
    marginTop: 10, // Spațiu între tabel și footer
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    fontSize: 7,
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // --- RÂNDUL DE SUS (Întocmit + Observații) ---
  topSection: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 4,
    paddingVertical: 3,
    minHeight: 25,
  },

  // Stiluri care replică exact "Detalii Document" din Header
  expeditionDetails: {
    fontSize: 7,
    color: '#475569',
    marginBottom: 1, // Spațiu minim între rânduri
    lineHeight: 1.3,
  },
  boldDetail: {
    fontWeight: 'bold',
    color: '#334155',
  },

  legalText: {
    fontSize: 6,
    color: PDF_COLORS.textMuted,
    marginTop: 1,
    lineHeight: 1.2,
  },

  // --- RÂNDUL DE JOS ---
  bottomSection: {
    flexDirection: 'row',
  },

  // Col 1: Legal Disclaimer
  colLegal: {
    width: '20%',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    padding: 4,
    justifyContent: 'center',
  },

  // Col 2: Expediție (Replică stilul colCenter din Header)
  colExpedition: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    padding: 4,
    paddingTop: 4,
    justifyContent: 'flex-start',
  },

  // Titlul de secțiune (replicat după sectionLabel din header)
  sectionLabelFooter: {
    fontSize: 7,
    fontWeight: 'bold',
    color: PDF_COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 2,
    width: '100%',
  },

  // Col 3: Totaluri + Semnătură Primire
  colTotals: {
    width: '40%',
    flexDirection: 'column',
  },

  // Grid Totaluri
  totalsGrid: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: 18,
  },
  totalBox: {
    flex: 1,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalBoxBorder: {
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },

  // Zona Total de Plată
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: 20,
  },

  // Semnătura Client
  clientSignatureSection: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 25,
  },

  bold: { fontWeight: 'bold' },

  totalLabelSmall: { fontSize: 6, color: PDF_COLORS.textMuted },
  totalValueSmall: { fontSize: 7, fontWeight: 'bold', color: PDF_COLORS.text },

  grandTotalLabel: { fontSize: 8, fontWeight: 'bold', color: PDF_COLORS.text },
  grandTotalValue: {
    fontSize: 9,
    fontWeight: 'heavy',
    color: PDF_COLORS.primary,
  },
})

interface Props {
  data: PdfDocumentData
}

export const PdfFooter: React.FC<Props> = ({ data }) => {
  const fmt = (n?: number) =>
    (n || 0).toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  // Logica pentru formatarea adresei (Obiect -> String)
  const formatDeliveryAddress = (addr: any) => {
    if (!addr) return null
    if (typeof addr === 'string')
      return addr.trim().length > 0 ? addr.trim() : null

    const parts = [
      addr.strada ? `Str. ${addr.strada.trim()}` : '',
      addr.numar ? `Nr. ${addr.numar}` : '',
      addr.alteDetalii ? addr.alteDetalii : '',
      addr.localitate,
      addr.judet,
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(', ') : null
  }

  const deliveryAddressObj = (data as any).deliveryAddress
  const formattedAddress = formatDeliveryAddress(deliveryAddressObj)

  const delegateName = data.delegate?.name
  const delegateVehicle = data.delegate?.vehicle
  const delegateTrailer = data.delegate?.trailer

  const subtotal = data.totals?.subtotal || 0
  const vatTotal = data.totals?.vatTotal || 0
  const grandTotal = data.totals?.grandTotal || 0

  return (
    <View style={styles.footerContainer}>
      {/* 1. SECTIUNEA DE SUS */}
      <View style={styles.topSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 7 }}>
            <Text style={styles.bold}>Întocmit de: </Text>
            {data.issuerName || 'Genesis'}
          </Text>
          {/* Note Document (Afișate dacă există) */}
          {(data as any).notes && (
            <Text
              style={{ fontSize: 7, marginLeft: 4, color: '#475569', flex: 1 }}
            >
              <Text style={styles.bold}> | Nota: </Text>
              {(data as any).notes}
            </Text>
          )}
        </View>
        {data.logistic?.deliveryNoteNumber && (
          <Text style={{ fontSize: 7, marginTop: 1 }}>
            <Text style={styles.bold}>Factură generată din Aviz: </Text>
            {data.logistic.deliveryNoteNumber}
          </Text>
        )}
        <Text style={styles.legalText}>
          <Text style={styles.bold}>Observații:</Text> Prezenta factură ține loc
          de contract în cazul în care între părți nu a fost încheiat un
          contract. În vederea întocmirii documentelor financiar-contabile,
          clientul este de acord cu prelucrarea datelor personale conform Legii
          nr. 190/2018.
        </Text>
      </View>

      {/* 2. SECTIUNEA DE JOS */}
      <View style={styles.bottomSection}>
        {/* COL 1: Legal Disclaimer */}
        <View style={styles.colLegal}>
          <Text
            style={[styles.legalText, { textAlign: 'center', fontSize: 5 }]}
          >
            Factura valabilă fără semnătură și ștampilă cf. art. 319 alin. (29)
            din Lg. 227/2015
          </Text>
        </View>

        {/* COL 2: Date Expediție (Stilizat ca Detalii Document din Header) */}
        <View style={styles.colExpedition}>
          <Text style={styles.sectionLabelFooter}>Date privind expediția</Text>

          {delegateName && (
            <Text style={styles.expeditionDetails}>
              <Text style={styles.boldDetail}>Nume delegat:</Text>{' '}
              {delegateName}
            </Text>
          )}

          {delegateVehicle && (
            <Text style={styles.expeditionDetails}>
              <Text style={styles.boldDetail}>Mijloc transp.:</Text>{' '}
              {delegateVehicle}
            </Text>
          )}

          {delegateTrailer && (
            <Text style={styles.expeditionDetails}>
              <Text style={styles.boldDetail}>Remorca:</Text> {delegateTrailer}
            </Text>
          )}

          {formattedAddress && (
            <Text style={styles.expeditionDetails}>
              <Text style={styles.boldDetail}>Adresa livrare:</Text>{' '}
              {formattedAddress}
            </Text>
          )}

          <Text style={styles.expeditionDetails}>
            <Text style={styles.boldDetail}>Data expedierii:</Text>{' '}
            {new Date().toLocaleDateString('ro-RO')}
          </Text>

          <Text style={[styles.expeditionDetails, { marginTop: 4 }]}>
            <Text style={styles.boldDetail}>Semnătură:</Text>{' '}
            _____________________
          </Text>
        </View>

        {/* COL 3: Totaluri + Semnătură Client */}
        <View style={styles.colTotals}>
          {/* Total Net | Total TVA */}
          <View style={styles.totalsGrid}>
            <View style={[styles.totalBox, styles.totalBoxBorder]}>
              <Text style={styles.totalLabelSmall}>Total Net:</Text>
              <Text style={styles.totalValueSmall}>{fmt(subtotal)} Lei</Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabelSmall}>Total TVA:</Text>
              <Text style={styles.totalValueSmall}>{fmt(vatTotal)} Lei</Text>
            </View>
          </View>

          {/* TOTAL DE PLATĂ */}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL DE PLATĂ</Text>
            <Text style={styles.grandTotalValue}>{fmt(grandTotal)} RON</Text>
          </View>

          {/* Semnătura de primire */}
          <View style={styles.clientSignatureSection}>
            <Text style={{ fontSize: 7, fontWeight: 'bold' }}>
              Semnătura de primire
            </Text>
            <Text style={{ fontSize: 5, color: PDF_COLORS.textMuted }}>
              (Beneficiar)
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}
