// components/printing/templates/ReceiptTemplate.tsx

import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { commonStyles, PDF_COLORS } from '../config/styles'
import { PdfHeader } from '../atoms/PdfHeader'
import { formatCurrency } from '@/lib/utils'

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Roboto',
    flexDirection: 'column',
  },
  receiptHalf: {
    height: '48%',
    paddingHorizontal: 30,
    paddingTop: 20,
    overflow: 'hidden',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderStyle: 'dashed',
    marginHorizontal: 30,
    height: '2%',
  },
  receiptBody: {
    marginTop: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 2,
  },
  label: {
    fontSize: 9,
    color: PDF_COLORS.textMuted,
    width: 100,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
    color: PDF_COLORS.text,
    flex: 1,
    fontWeight: 'bold',
  },
  amountBox: {
    marginTop: 5,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyLabel: {
    fontSize: 8,
    textAlign: 'right',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
})

export const ReceiptTemplate: React.FC<{ data: PdfDocumentData }> = ({
  data,
}) => {
  const isCancelled = data.status === 'CANCELLED'
  const [explanation] = data.notes ? data.notes.split('|') : ['', '']

  const ReceiptHalf = () => (
    <View style={styles.receiptHalf}>
      <PdfHeader
        supplier={data.supplier}
        client={data.client}
        title='CHITANȚĂ'
        meta={{
          series: data.series,
          number: data.number,
          date: data.date,
        }}
      />

      <View style={styles.receiptBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Am primit de la:</Text>
          <Text style={styles.value}>{data.client.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Adresa:</Text>
          <Text style={styles.value}>
            {data.client.address.strada} {data.client.address.numar},{' '}
            {data.client.address.localitate}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reprezentant:</Text>
          <Text style={styles.value}>{data.delegate?.name || '-'}</Text>
        </View>

        <View style={styles.amountBox}>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Text style={styles.label}>Suma de:</Text>
            <Text
              style={[
                styles.value,
                { fontSize: 12, color: PDF_COLORS.primary, fontWeight: 'bold' },
              ]}
            >
              {formatCurrency(data.totals.grandTotal)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.label}>În litere:</Text>
            <Text style={styles.value}>{data.issuerName}</Text>
          </View>
        </View>

        <View style={[styles.row, { marginTop: 10, borderBottomWidth: 0 }]}>
          <Text style={styles.label}>Reprezentând:</Text>
          <Text style={styles.value}>{explanation.trim()}</Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ alignItems: 'center', width: 150 }}>
          <Text style={{ fontSize: 9 }}>Casier,</Text>
          <Text style={{ marginTop: 5, fontWeight: 'bold', fontSize: 10 }}>
            {data.logistic?.receivedBy || '-'}
          </Text>
        </View>
      </View>
    </View>
  ) // Închidere ReceiptHalf

  return (
    <Document title={`Chitanta ${data.series} ${data.number}`}>
      <Page size='A4' style={styles.page}>
        <ReceiptHalf />
        <View style={styles.divider} />
        <ReceiptHalf />
      </Page>
    </Document>
  )
}
