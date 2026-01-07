import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { commonStyles, PDF_COLORS } from '../config/styles'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'

interface PdfInfoBoxProps {
  client: PdfDocumentData['client']
  meta: Pick<PdfDocumentData, 'series' | 'number' | 'date' | 'dueDate'>
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  box: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
  },
  label: {
    fontSize: 8,
    color: PDF_COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  content: { fontSize: 10, fontWeight: 'medium' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
})

export const PdfInfoBox: React.FC<PdfInfoBoxProps> = ({ client, meta }) => {
  const formatAddress = (addr: any) =>
    `${addr.strada || ''} ${addr.numar || ''}, ${addr.localitate || ''}, ${addr.judet || ''}`

  return (
    <View style={styles.container}>
      {/* Box Stânga: CLIENT */}
      <View style={styles.box}>
        <Text style={styles.label}>Client / Beneficiar</Text>
        <Text style={[styles.content, { fontWeight: 'bold' }]}>
          {client.name}
        </Text>
        <Text style={styles.content}>CUI: {client.cui}</Text>
        <Text style={styles.content}>Reg.Com: {client.regCom}</Text>
        <Text style={styles.content}>{formatAddress(client.address)}</Text>
        {client.bank && (
          <Text style={styles.content}>Banca: {client.bank}</Text>
        )}
        {client.iban && <Text style={styles.content}>IBAN: {client.iban}</Text>}
      </View>

      {/* Box Dreapta: DETALII DOC */}
      <View style={styles.box}>
        <Text style={styles.label}>Detalii Document</Text>

        <View style={styles.row}>
          <Text style={styles.content}>Serie / Număr:</Text>
          <Text style={[styles.content, { fontWeight: 'bold' }]}>
            {meta.series} {meta.number}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.content}>Data Emiterii:</Text>
          <Text style={styles.content}>{meta.date}</Text>
        </View>

        {meta.dueDate && (
          <View style={styles.row}>
            <Text style={styles.content}>Scadență:</Text>
            <Text style={styles.content}>{meta.dueDate}</Text>
          </View>
        )}
      </View>
    </View>
  )
}
