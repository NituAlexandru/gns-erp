import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { formatCurrency } from '@/lib/utils'

// Funcție pentru precizie de 6 zecimale (fără separator de mii pentru a nu încărca vizual coloanele mici)
const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('ro-RO', {
    currency: 'RON',
    style: 'currency',
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(amount)
}

const styles = StyleSheet.create({
  table: { marginTop: 5, width: '100%' },
  header: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    minHeight: 25, // Mărit pentru nume coloane mai lungi
    alignItems: 'center',
  },
  indexRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    height: 12,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    minHeight: 24,
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    height: 20,
    alignItems: 'center',
  },
  // AJUSTARE LĂȚIMI PENTRU 100% WIDTH
  colNr: { width: '3%', textAlign: 'center' },
  colName: { width: '25%', textAlign: 'left', paddingLeft: 4 }, // Mai lat pentru nume pe un rând
  colUm: { width: '4%', textAlign: 'center' },
  colQty: { width: '5%', textAlign: 'right', paddingRight: 2 },
  colDiff: { width: '5%', textAlign: 'right', paddingRight: 2 },
  colPrice: { width: '8%', textAlign: 'right', paddingRight: 2 },
  colValue: { width: '9%', textAlign: 'right', paddingRight: 2 },
  colVat: { width: '8%', textAlign: 'right', paddingRight: 2 },
  colTotal: { width: '9%', textAlign: 'right', paddingRight: 4 },
  text: { fontSize: 6, color: '#1e293b' }, // Font ușor redus pentru a acomoda precizia de 6 zecimale
  bold: { fontWeight: 'bold' },
})

export const PdfNirTable = ({ items }: { items: any[] }) => {
  const totals = items.reduce(
    (acc, item) => ({
      qtyDoc: acc.qtyDoc + (item.docQty || 0),
      qtyRec: acc.qtyRec + (item.recQty || 0),
      value: acc.value + (item.lineValue || 0),
      vat: acc.vat + (item.lineVatValue || 0),
      total: acc.total + (item.total || 0),
    }),
    { qtyDoc: 0, qtyRec: 0, value: 0, vat: 0, total: 0 }
  )

  return (
    <View style={styles.table}>
      {/* CAP TABEL ACTUALIZAT CONFORM INSTRUCȚIUNILOR */}
      <View style={styles.header} fixed>
        <Text style={[styles.colNr, styles.text, styles.bold]}>Nr.</Text>
        <Text style={[styles.colName, styles.text, styles.bold]}>
          Denumire Produs / Ambalaj
        </Text>
        <Text style={[styles.colUm, styles.text, styles.bold]}>UM</Text>
        <Text style={[styles.colQty, styles.text, styles.bold]}>
          Cant. doc.
        </Text>
        <Text style={[styles.colQty, styles.text, styles.bold]}>
          Cant. recepț.
        </Text>
        <Text style={[styles.colDiff, styles.text, styles.bold]}>
          Diferențe
        </Text>
        <Text style={[styles.colPrice, styles.text, styles.bold]}>
          Preț achiz.
        </Text>
        <Text style={[styles.colPrice, styles.text, styles.bold]}>
          Cost distribuit transp.
        </Text>
        <Text style={[styles.colPrice, styles.text, styles.bold]}>
          Preț unitar de intrare
        </Text>
        <Text style={[styles.colValue, styles.text, styles.bold]}>
          Valoare Net
        </Text>
        <Text style={[styles.colVat, styles.text, styles.bold]}>TVA</Text>
        <Text style={[styles.colTotal, styles.text, styles.bold]}>Total</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.colNr, styles.text]}>{i + 1}</Text>
          <View style={styles.colName}>
            <Text style={[styles.text, styles.bold]}>{item.name}</Text>
          </View>
          <Text style={[styles.colUm, styles.text]}>{item.uom}</Text>
          <Text style={[styles.colQty, styles.text]}>
            {item.docQty.toFixed(2)}
          </Text>
          <Text style={[styles.colQty, styles.text, styles.bold]}>
            {item.recQty.toFixed(2)}
          </Text>
          <Text
            style={[
              styles.colDiff,
              styles.text,
              styles.bold,
              { color: item.diffQty !== 0 ? '#ef4444' : '#1e293b' },
            ]}
          >
            {item.diffQty !== 0 ? item.diffQty.toFixed(2) : '0.00'}
          </Text>
          <Text style={[styles.colPrice, styles.text]}>
            {formatCurrency(item.invoicePricePerUnit)}
          </Text>
          <Text style={[styles.colPrice, styles.text]}>
            {formatPrice(item.distributedTransportCostPerUnit)}
          </Text>
          <Text style={[styles.colPrice, styles.text, styles.bold]}>
            {formatPrice(item.landedCostPerUnit)}
          </Text>

          <Text style={[styles.colValue, styles.text]}>
            {formatCurrency(item.lineValue)}
          </Text>
          <Text style={[styles.colVat, styles.text]}>
            {formatCurrency(item.lineVatValue)}
          </Text>
          <Text style={[styles.colTotal, styles.text, styles.bold]}>
            {formatCurrency(item.total)}
          </Text>
        </View>
      ))}

      <View style={styles.footerRow}>
        <Text
          style={[
            { width: '28%' },
            styles.text,
            styles.bold,
            { textAlign: 'right', paddingRight: 10 },
          ]}
        >
          TOTAL PAGINA:
        </Text>
        <View style={{ width: '4%' }} />
        <Text style={[styles.colQty, styles.text, styles.bold]}>
          {totals.qtyDoc.toFixed(2)}
        </Text>
        <Text style={[styles.colQty, styles.text, styles.bold]}>
          {totals.qtyRec.toFixed(2)}
        </Text>
        <View style={{ width: '29%' }} />
        <Text style={[styles.colValue, styles.text, styles.bold]}>
          {formatCurrency(totals.value)}
        </Text>
        <Text style={[styles.colVat, styles.text, styles.bold]}>
          {formatCurrency(totals.vat)}
        </Text>
        <Text style={[styles.colTotal, styles.text, styles.bold]}>
          {formatCurrency(totals.total)}
        </Text>
      </View>
    </View>
  )
}
