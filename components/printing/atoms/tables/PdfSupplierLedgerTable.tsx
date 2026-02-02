import { Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatCurrency } from '@/lib/utils'

const styles = StyleSheet.create({
  table: { width: '100%', marginTop: 20, fontSize: 8 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 20,
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
    color: '#64748b',
  },
  cell: { padding: 4 },

  // Coloane (aceleași dimensiuni ca la client)
  colDate: { width: '13%' },
  colDoc: { width: '20%' },
  colDetails: { width: '23%' },
  colDebit: { width: '15%', textAlign: 'right' },
  colCredit: { width: '15%', textAlign: 'right' },
  colBalance: { width: '14%', textAlign: 'right', fontWeight: 'bold' },
  debitColor: { color: '#16a34a' },
  creditColor: { color: '#dc2626' },
})

export const PdfSupplierLedgerTable = ({ entries }: { entries: any[] }) => {
  const finalBalance =
    entries.length > 0 ? entries[entries.length - 1].balance : 0
  const finalColor = finalBalance > 0 ? styles.creditColor : styles.debitColor

  return (
    <View style={styles.table}>
      {/* HEADER */}
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, styles.colDate]}>Data</Text>
        <Text style={[styles.cell, styles.colDoc]}>Document</Text>
        <Text style={[styles.cell, styles.colDetails]}>Detalii</Text>
        <Text style={[styles.cell, styles.colDebit]}>Debit</Text>
        <Text style={[styles.cell, styles.colCredit]}>Credit</Text>
        <Text style={[styles.cell, styles.colBalance]}>Sold</Text>
      </View>

      {/* ROWS */}
      {entries.map((entry, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.cell, styles.colDate]}>
            {new Date(entry.date).toLocaleDateString('ro-RO')}
          </Text>
          <Text style={[styles.cell, styles.colDoc]}>
            {entry.documentNumber}
          </Text>
          <Text style={[styles.cell, styles.colDetails]}>{entry.details}</Text>

          {/* DEBIT - VERDE (Plata) */}
          <Text
            style={[
              styles.cell,
              styles.colDebit,
              entry.debit ? styles.debitColor : {},
            ]}
          >
            {entry.debit ? formatCurrency(entry.debit) : '-'}
          </Text>

          {/* CREDIT - ROȘU (Datorie) */}
          <Text
            style={[
              styles.cell,
              styles.colCredit,
              entry.credit ? styles.creditColor : {},
            ]}
          >
            {entry.credit ? formatCurrency(entry.credit) : '-'}
          </Text>

          {/* SOLD */}
          <Text style={[styles.cell, styles.colBalance]}>
            {formatCurrency(entry.balance)}
          </Text>
        </View>
      ))}
      <View
        style={[
          styles.row,
          { borderBottomWidth: 0, marginTop: 5, justifyContent: 'flex-end' },
        ]}
      >
        <Text
          style={{
            fontSize: 8,
            fontWeight: 'bold',
            marginRight: 10,
            padding: 4,
          }}
        >
          SOLD FINAL FURNIZOR:
        </Text>
        <Text
          style={[
            styles.cell,
            styles.colBalance,
            finalColor,
            { textAlign: 'right', fontSize: 9 },
          ]}
        >
          {formatCurrency(finalBalance)}
        </Text>
      </View>
    </View>
  )
}
