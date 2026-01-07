import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS } from '../../config/styles'
import {
  PdfLineItem,
  PdfTotals,
} from '@/lib/db/modules/printing/printing.types'

// Definim lățimile coloanelor o singură dată pentru a le folosi peste tot
const COL_WIDTHS = {
  index: '5%',
  name: '45%',
  qty: '5%',
  um: '5%',
  price: '10%',
  value: '15%', // Valoare Netă
  vatRate: '5%',
  vatValue: '10%', // Valoare TVA
}

const styles = StyleSheet.create({
  tableContainer: {
    flexDirection: 'column',
    marginTop: 2,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden', // Pentru colțuri rotunjite
  },

  // --- HEADER PRINCIPAL ---
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc', // bg-muted/50
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: PDF_COLORS.text,
  },

  // --- SUB-HEADER (Numerotare 0-7) ---
  subHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    height: 16, // Mai scund
    backgroundColor: '#ffffff',
    paddingHorizontal: 2,
  },
  subHeaderText: {
    fontSize: 7,
    color: PDF_COLORS.textMuted,
    fontWeight: 'normal',
  },

  // --- RÂNDURI PRODUSE ---
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9', // Mai deschis decât border-ul principal
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    paddingRight: 2,
  },
  cellText: {
    fontSize: 8,
    color: PDF_COLORS.text,
  },
  productName: {
    fontSize: 8,
    color: PDF_COLORS.text,
  },
  productCode: {
    fontSize: 7,
    color: PDF_COLORS.textMuted,
  },

  // --- TOTALURI ---
  totalsSection: {
    marginTop: 10,
    paddingRight: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
    width: '40%', // Ocupăm doar partea dreaptă
  },
  totalLabel: {
    width: '50%',
    textAlign: 'right',
    fontSize: 8,
    color: PDF_COLORS.textMuted,
    paddingRight: 10,
  },
  totalValue: {
    width: '50%',
    textAlign: 'right',
    fontSize: 9,
    fontWeight: 'bold',
    color: PDF_COLORS.text,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 'heavy',
    color: PDF_COLORS.primary,
  },
  grandTotalValue: {
    fontSize: 10,
    fontWeight: 'heavy',
    color: PDF_COLORS.primary,
  },
  currencyLabel: {
    fontSize: 9,
    textAlign: 'right',
    marginBottom: 2, // Spațiu mic între text și tabel
    fontWeight: 'bold',
    color: PDF_COLORS.text,
  },
  // Helper styles pentru aliniere
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },
})

interface Props {
  items: PdfLineItem[]
  totals: PdfTotals
}

export const PdfInvoiceTable: React.FC<Props> = ({ items, totals }) => {
  // Formatare numere (stil RO)
  const fmt = (n?: number) => {
    if (n === undefined || n === null) return '0.00'
    return n.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <View>
      <Text style={styles.currencyLabel}>Moneda: RON</Text>
      <View style={styles.tableContainer}>
        {/* 1. HEADER PRINCIPAL */}
        <View style={styles.headerRow} fixed>
          <Text
            style={[
              styles.headerText,
              styles.textCenter,
              { width: COL_WIDTHS.index },
            ]}
          >
            #
          </Text>
          <Text
            style={[
              styles.headerText,
              styles.textLeft,
              { width: COL_WIDTHS.name },
            ]}
          >
            Descriere Produs
          </Text>
          <Text
            style={[
              styles.headerText,
              styles.textCenter,
              { width: COL_WIDTHS.qty },
            ]}
          >
            Cant.
          </Text>
          <Text
            style={[
              styles.headerText,
              styles.textCenter,
              { width: COL_WIDTHS.um },
            ]}
          >
            UM
          </Text>
          <Text
            style={[
              styles.headerText,
              styles.textRight,
              { width: COL_WIDTHS.price },
            ]}
          >
            Preț Unit.
          </Text>
          <Text
            style={[
              styles.headerText,
              styles.textRight,
              { width: COL_WIDTHS.value },
            ]}
          >
            Valoare
          </Text>
          <Text
            style={[
              styles.headerText,
              styles.textRight,
              { width: COL_WIDTHS.vatRate },
            ]}
          >
            TVA%
          </Text>
          <Text
            style={[
              styles.headerText,
              styles.textRight,
              { width: COL_WIDTHS.vatValue },
            ]}
          >
            Valoare TVA
          </Text>
        </View>

        {/* 2. SUB-HEADER (Numerotare Coloane 0-7) */}
        <View style={styles.subHeaderRow} fixed>
          <Text
            style={[
              styles.subHeaderText,
              styles.textCenter,
              { width: COL_WIDTHS.index },
            ]}
          >
            0
          </Text>
          <Text
            style={[
              styles.subHeaderText,
              styles.textLeft,
              { width: COL_WIDTHS.name },
            ]}
          >
            1
          </Text>
          <Text
            style={[
              styles.subHeaderText,
              styles.textCenter,
              { width: COL_WIDTHS.qty },
            ]}
          >
            2
          </Text>
          <Text
            style={[
              styles.subHeaderText,
              styles.textCenter,
              { width: COL_WIDTHS.um },
            ]}
          >
            3
          </Text>
          <Text
            style={[
              styles.subHeaderText,
              styles.textRight,
              { width: COL_WIDTHS.price },
            ]}
          >
            4
          </Text>
          <Text
            style={[
              styles.subHeaderText,
              styles.textRight,
              { width: COL_WIDTHS.value },
            ]}
          >
            5
          </Text>
          <Text
            style={[
              styles.subHeaderText,
              styles.textRight,
              { width: COL_WIDTHS.vatRate },
            ]}
          >
            6
          </Text>
          <Text
            style={[
              styles.subHeaderText,
              styles.textRight,
              { width: COL_WIDTHS.vatValue },
            ]}
          >
            7
          </Text>
        </View>

        {/* 3. ITEMS */}
        {items.map((item, i) => (
          <View key={i} style={styles.row} wrap={false}>
            {/* 0. Index */}
            <Text
              style={[
                styles.cellText,
                styles.textCenter,
                { width: COL_WIDTHS.index },
              ]}
            >
              {i + 1}
            </Text>

            {/* 1. Descriere (Nume + Cod + Detalii) */}
            <View
              style={{
                width: COL_WIDTHS.name,
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Text style={styles.productName}>{item.name}</Text>

              {/* ZONA NOUĂ: Cod și Detalii */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* Afișăm codul cu # */}
                {item.code && item.code !== 'N/A' && (
                  <Text style={styles.productCode}># {item.code} </Text>
                )}

                {/* Separator dacă avem ambele */}
                {item.code && item.code !== 'N/A' && item.details && (
                  <Text style={styles.productCode}> - </Text>
                )}

                {/* Afișăm detaliile (ex: Produs vândut la...) */}
                {item.details && (
                  <Text style={styles.productCode}>{item.details}</Text>
                )}
              </View>
            </View>

            {/* 2. Cantitate */}
            <Text
              style={[
                styles.cellText,
                styles.textCenter,
                { width: COL_WIDTHS.qty },
              ]}
            >
              {item.quantity}
            </Text>

            {/* 3. UM */}
            <Text
              style={[
                styles.cellText,
                styles.textCenter,
                { width: COL_WIDTHS.um, textTransform: 'lowercase' },
              ]}
            >
              {item.uom}
            </Text>

            {/* 4. Pret Unitar */}
            <Text
              style={[
                styles.cellText,
                styles.textRight,
                { width: COL_WIDTHS.price },
              ]}
            >
              {fmt(item.price)}
            </Text>

            {/* 5. Valoare (Net) */}
            <Text
              style={[
                styles.cellText,
                styles.textRight,
                { width: COL_WIDTHS.value },
              ]}
            >
              {fmt(item.value)}
            </Text>

            {/* 6. TVA % */}
            <Text
              style={[
                styles.cellText,
                styles.textRight,
                { width: COL_WIDTHS.vatRate },
              ]}
            >
              {item.vatRate ? `${item.vatRate}%` : '-'}
            </Text>

            {/* 7. Valoare TVA */}
            <Text
              style={[
                styles.cellText,
                styles.textRight,
                { width: COL_WIDTHS.vatValue },
              ]}
            >
              {fmt(item.vatValue)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
