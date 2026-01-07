import React from 'react'
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer' // Importat Image
import { PDF_COLORS } from '../../config/styles'

const styles = StyleSheet.create({
  tableContainer: { flexDirection: 'column', marginTop: 2, width: '100%' },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    minHeight: 20,
    alignItems: 'center',
  },
  subHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 15,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 18, // Crescut pentru a face loc codului de bare
    alignItems: 'center',
    paddingVertical: 0,
  },
  colNr: { width: '5%', textAlign: 'center' },
  colBarcode: { width: '20%', textAlign: 'center', paddingHorizontal: 2 },
  colName: { width: '55%', textAlign: 'left', paddingLeft: 4 },
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
  cellText: { fontSize: 8, color: PDF_COLORS.text, lineHeight: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 0,
  },
  codeText: { fontSize: 6, color: '#64748b', marginTop: 1 },
  smartDescText: {
    fontSize: 6,
    color: '#0369a1',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  barcodeImage: { width: 80, height: 30, objectFit: 'contain' }, // Stil pentru imaginea barcode
})

interface Props {
  items: any[]
}

export const PdfDeliveryNoteTable: React.FC<Props> = ({ items }) => {
  // Construim URL-ul pentru API-ul de barcode (fără 'use client' sau useTheme, hardcodăm light/dark)
  const getBarcodeUrl = (text: string) =>
    `${process.env.NEXT_PUBLIC_APP_URL}/api/barcode?text=${encodeURIComponent(text)}&type=code128&theme=light`

  return (
    <View style={styles.tableContainer}>
      <View style={styles.headerRow} fixed>
        <View style={styles.colNr}>
          <Text style={styles.headerText}>Nr.</Text>
        </View>
        <View style={styles.colBarcode}>
          <Text style={styles.headerText}>Cod Bare</Text>
        </View>
        <View style={styles.colName}>
          <Text style={styles.headerText}>Produs / Ambalaj / Serviciu</Text>
        </View>
        <View style={styles.colUom}>
          <Text style={styles.headerText}>U.M.</Text>
        </View>
        <View style={styles.colQty}>
          <Text style={styles.headerText}>Cantitate</Text>
        </View>
      </View>

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

      {items.map((item, i) => (
        <View key={i} style={styles.row} wrap={false}>
          <View style={styles.colNr}>
            <Text style={styles.cellText}>{i + 1}</Text>
          </View>

          <View style={styles.colBarcode}>
            {item.barcode ? (
              <View style={{ alignItems: 'center' }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image
                  src={getBarcodeUrl(item.barcode)}
                  style={styles.barcodeImage}
                />
                <Text style={{ fontSize: 5, marginTop: 1 }}>
                  {item.barcode}
                </Text>
              </View>
            ) : (
              <Text style={[styles.cellText, { color: '#e2e8f0' }]}>-</Text>
            )}
          </View>

          <View style={styles.colName}>
            {/* Denumire Produs */}
            <Text style={[styles.cellText, { fontWeight: 'bold' }]}>
              {item.name}
            </Text>

            {/* Linie Metadate: Cod + Descriere Smart */}
            <View style={styles.metaRow}>
              <Text style={styles.codeText}>Cod: {item.code}</Text>

              {item.details && (
                <Text style={styles.smartDescText}>• {item.details}</Text>
              )}
            </View>
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
