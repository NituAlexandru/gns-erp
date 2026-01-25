import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS } from '../../config/styles'
import { formatCurrency } from '@/lib/utils'

const styles = StyleSheet.create({
  tableContainer: {
    flexDirection: 'column',
    marginTop: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 8,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    height: 20,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    minHeight: 16,
    alignItems: 'center',
  },

  // Coloane
  colDate: { width: '12%', paddingLeft: 4 },
  colDoc: { width: '18%', paddingLeft: 2 },
  colDetails: { width: '30%', paddingLeft: 2 },
  colDebit: {
    width: '13%',
    textAlign: 'right',
    paddingRight: 4,
    color: '#dc2626',
  }, // Rosu
  colCredit: {
    width: '13%',
    textAlign: 'right',
    paddingRight: 4,
    color: '#16a34a',
  }, // Verde
  colBalance: {
    width: '14%',
    textAlign: 'right',
    paddingRight: 4,
    fontWeight: 'bold',
  },

  headerText: { fontWeight: 'bold', color: '#475569' },
  cellText: { color: PDF_COLORS.text },
  bold: { fontWeight: 'bold' },
  footerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    height: 24,
    alignItems: 'center',
  },
  footerLabel: {
    width: '86%',
    textAlign: 'right',
    paddingRight: 10,
    fontWeight: 'bold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  footerValue: {
    width: '14%',
    textAlign: 'right',
    paddingRight: 4,
    fontWeight: 'heavy',
    fontSize: 9,
  },
})

export const PdfClientLedgerTable = ({ entries }: { entries: any[] }) => {
  const fmt = (n: number) => formatCurrency(n)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO')
  const finalBalance =
    entries.length > 0 ? entries[entries.length - 1].balance : 0

  return (
    <View style={styles.tableContainer}>
      {/* Header */}
      <View style={styles.headerRow} fixed>
        <Text style={[styles.colDate, styles.headerText]}>Data</Text>
        <Text style={[styles.colDoc, styles.headerText]}>Document</Text>
        <Text style={[styles.colDetails, styles.headerText]}>Detalii</Text>
        <Text style={[styles.colDebit, styles.headerText]}>Debit</Text>
        <Text style={[styles.colCredit, styles.headerText]}>Credit</Text>
        <Text style={[styles.colBalance, styles.headerText]}>Sold</Text>
      </View>

      {/* Rows */}
      {entries.map((item, i) => (
        <View key={i} style={styles.row} wrap={false}>
          <Text style={[styles.colDate, styles.cellText]}>
            {fmtDate(item.date)}
          </Text>
          <Text style={[styles.colDoc, styles.cellText]}>
            {item.documentNumber}
          </Text>
          <Text style={[styles.colDetails, styles.cellText]}>
            {item.details}
          </Text>

          <Text style={[styles.colDebit]}>
            {item.debit !== 0 ? fmt(item.debit) : '-'}
          </Text>

          <Text style={[styles.colCredit]}>
            {item.credit !== 0 ? fmt(Math.abs(item.credit)) : '-'}
          </Text>

          <Text style={[styles.colBalance, styles.cellText]}>
            {fmt(item.balance)}
          </Text>
        </View>
      ))}
      <View style={styles.footerRow} wrap={false}>
        <Text style={styles.footerLabel}>SOLD FINAL CLIENT:</Text>
        <Text
          style={[
            styles.footerValue,
            { color: finalBalance > 0 ? '#dc2626' : '#16a34a' },
          ]}
        >
          {fmt(finalBalance)}
        </Text>
      </View>
    </View>
  )
}
