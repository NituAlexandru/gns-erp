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

export const PdfSupplierLedgerTable = ({
  entries,
  totals,
  period,
}: {
  entries: any[]
  totals?: any
  period?: { from: string; to: string }
}) => {
  const safeTotals = totals || {
    initialBalance: 0,
    initialDebit: 0,
    initialCredit: 0,
    totalDebit: 0,
    totalCredit: 0,
    finalBalance: entries.length > 0 ? entries[entries.length - 1].balance : 0,
  }
  const finalColor =
    safeTotals.finalBalance > 0 ? styles.creditColor : styles.debitColor

  return (
    <View style={styles.table}>
      {/* HEADER */}
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, styles.colDate]}>Data</Text>
        <Text style={[styles.cell, styles.colDoc]}>Document</Text>
        <Text style={[styles.cell, styles.colDetails]}>Detalii</Text>
        <Text style={[styles.cell, styles.colDebit]}>Debit (Plătit)</Text>
        <Text style={[styles.cell, styles.colCredit]}>Credit (Facturat)</Text>
        <Text style={[styles.cell, styles.colBalance]}>Sold</Text>
      </View>

      {/* Rând Sold Precedent */}
      <View
        style={[styles.row, { backgroundColor: '#f8fafc', minHeight: 20 }]}
        wrap={false}
      >
        <Text
          style={{
            width: '56%',
            textAlign: 'left',
            paddingRight: 10,
            fontWeight: 'bold',
          }}
        >
          SOLD PRECEDENT LA ÎNCEPUTUL PERIOADEI{' '}
          {period?.from ? `(${period.from} - ${period.to})` : ''}:
        </Text>
        <Text
          style={[
            styles.colDebit,
            { fontWeight: 'bold', padding: 4, color: '#16a34a' },
          ]}
        >
          {formatCurrency(safeTotals.initialDebit)}
        </Text>
        <Text
          style={[
            styles.colCredit,
            { fontWeight: 'bold', padding: 4, color: '#dc2626' },
          ]}
        >
          {formatCurrency(safeTotals.initialCredit)}
        </Text>
        <Text style={[styles.colBalance, { padding: 4 }]}>
          {formatCurrency(safeTotals.initialBalance)}
        </Text>
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
          {
            backgroundColor: '#f8fafc',
            borderBottomWidth: 0,
            borderTopWidth: 1,
            borderTopColor: '#cbd5e1',
            marginTop: 5,
            minHeight: 24,
          },
        ]}
        wrap={false}
      >
        <Text
          style={{
            width: '56%',
            textAlign: 'right',
            paddingRight: 10,
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          TOTAL RULAJE / SOLD FINAL:
        </Text>
        <Text
          style={[
            styles.colDebit,
            { fontWeight: 'bold', padding: 4, color: '#16a34a' },
          ]}
        >
          {formatCurrency(safeTotals.totalDebit)}
        </Text>
        <Text
          style={[
            styles.colCredit,
            { fontWeight: 'bold', padding: 4, color: '#dc2626' },
          ]}
        >
          {formatCurrency(safeTotals.totalCredit)}
        </Text>
        <Text
          style={[styles.colBalance, finalColor, { padding: 4, fontSize: 9 }]}
        >
          {formatCurrency(safeTotals.finalBalance)}
        </Text>
      </View>
    </View>
  )
}
