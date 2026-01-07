import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS } from '../config/styles'

const styles = StyleSheet.create({
  tableContainer: { flexDirection: 'column', marginTop: 10, width: '100%' },

  // Header Table
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    minHeight: 20,
    alignItems: 'center',
  },

  // Sub-Header (Numerotare coloane)
  subHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: 12,
    alignItems: 'center',
  },

  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 25,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },

  // Coloane Logistice
  colNr: { width: '5%', textAlign: 'center' },
  colBarcode: { width: '15%', textAlign: 'left', paddingLeft: 4 },
  colName: { width: '60%', textAlign: 'left', paddingLeft: 8 },
  colUom: { width: '10%', textAlign: 'center' },
  colQty: { width: '10%', textAlign: 'right', paddingRight: 4 },

  headerText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  subHeaderText: {
    fontSize: 6,
    color: '#94a3b8',
    textAlign: 'center',
    width: '100%',
  },
  cellText: { fontSize: 8, color: PDF_COLORS.text },
  codeText: { fontSize: 6, color: '#64748b', marginTop: 1 },
  smartDescText: {
    fontSize: 6,
    color: '#0369a1',
    marginTop: 1,
    fontStyle: 'italic',
  },
  barcodeText: { fontSize: 7, color: '#000', fontFamily: 'Courier' }, // Courier imită aspectul de cod bare text
})

interface Props {
  items: any[]
}

export const PdfDeliveryNoteTable: React.FC<Props> = ({ items }) => {
  return (
    <View style={styles.tableContainer}>
      {/* 1. Header principal */}
      <View style={styles.headerRow} fixed>
        <View style={styles.colNr}>
          <Text style={styles.headerText}>Nr.</Text>
        </View>
        <View style={styles.colBarcode}>
          <Text style={styles.headerText}>Cod Bare</Text>
        </View>
        <View style={styles.colName}>
          <Text style={styles.headerText}>Denumire Produs / Serviciu</Text>
        </View>
        <View style={styles.colUom}>
          <Text style={styles.headerText}>U.M.</Text>
        </View>
        <View style={styles.colQty}>
          <Text style={styles.headerText}>Cantitate</Text>
        </View>
      </View>

      {/* 2. Numerotare coloane */}
      <View style={styles.subHeaderRow} fixed>
        <View style={styles.colNr}>
          <Text style={styles.subHeaderText}>0</Text>
        </View>
        <View style={styles.colBarcode}>
          <Text style={styles.subHeaderText}>1</Text>
        </View>
        <View style={styles.colName}>
          <Text style={styles.subHeaderText}>2</Text>
        </View>
        <View style={styles.colUom}>
          <Text style={styles.subHeaderText}>3</Text>
        </View>
        <View style={styles.colQty}>
          <Text style={styles.subHeaderText}>4</Text>
        </View>
      </View>

      {/* 3. Randurile de produse */}
      {items.map((item, i) => (
        <View key={i} style={styles.row} wrap={false}>
          <View style={styles.colNr}>
            <Text style={styles.cellText}>{i + 1}</Text>
          </View>

          <View style={styles.colBarcode}>
            {item.barcode ? (
              <Text style={styles.barcodeText}>{item.barcode}</Text>
            ) : (
              <Text style={[styles.cellText, { color: '#e2e8f0' }]}>-</Text>
            )}
          </View>

          <View style={styles.colName}>
            <Text style={[styles.cellText, { fontWeight: 'bold' }]}>
              {item.name}
            </Text>
            <Text style={styles.codeText}>Cod: {item.code}</Text>
            {item.details && (
              <Text style={styles.smartDescText}>{item.details}</Text>
            )}
          </View>

          <View style={styles.colUom}>
            <Text style={styles.cellText}>{item.uom}</Text>
          </View>

          <View style={styles.colQty}>
            <Text style={[styles.cellText, { fontWeight: 'bold' }]}>
              {item.quantity.toLocaleString('ro-RO')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}
