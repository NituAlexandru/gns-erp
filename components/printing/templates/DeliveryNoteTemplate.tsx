import React from 'react'
import {
  Document,
  Page,
  View,
  StyleSheet,
  Font,
  Text,
} from '@react-pdf/renderer'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { PdfHeader } from '../atoms/PdfHeader'
import { PdfDeliveryNoteTable } from '../atoms/tables/PdfDeliveryNoteTable'

// 1. ÎNREGISTRARE FONT (Roboto pentru diacritice)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Roboto-Italic.ttf', fontStyle: 'italic' },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontFamily: 'Roboto',
    flexDirection: 'column',
    paddingLeft: 17,
  },
  halfPageContainer: {
    height: '48%',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'dashed',
    paddingBottom: 20,
    marginBottom: 0,
    position: 'relative',
  },
  lastContainer: {
    borderBottomWidth: 0,
    marginBottom: 0,
    marginTop: 5,
  },
  exemplarLabel: {
    position: 'absolute',
    right: 0,
    top: -5,
    fontSize: 7,
    color: '#999',
    fontWeight: 'bold',
  },
  fullPageContainer: {
    height: '100%',
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 0,
    position: 'relative',
    flex: 1,
  },
  // FOOTER ULTRA-COMPACT
  footerContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginTop: 'auto',
    paddingTop: 4,
    paddingLeft: 2,
    minHeight: 40,
  },
  footerColFurnizor: {
    width: '18%',
    borderRightWidth: 0.5,
    borderRightColor: '#eee',
    paddingRight: 4,
  },
  footerColExpeditie: {
    width: '41%',
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#eee',
  },
  footerColPrimire: {
    width: '41%',
    paddingLeft: 6,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  footerTitle: {
    fontSize: 6,
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
    color: '#475569',
  },
  footerText: {
    fontSize: 6.5,
    lineHeight: 1.2,
  },
  signatureLine: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#94a3b8',
    width: '90%',
  },
  totalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'flex-end',
    backgroundColor: '#f8fafc',
    padding: 3,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 7,
    fontWeight: 'bold',
  },
})

interface Props {
  data: PdfDocumentData
}

const DeliveryNoteFooter = ({ data }: { data: PdfDocumentData }) => {
  // CALCUL TOTALURI PE U.M. (FRONTEND)
  const totalsByUm = data.items.reduce((acc: Record<string, number>, item) => {
    const um = (item.um || 'buc').toLowerCase()
    acc[um] = (acc[um] || 0) + (Number(item.quantity) || 0)
    return acc
  }, {})

  const now = new Date()
  const currentDate = now.toLocaleDateString('ro-RO')
  const currentTime = now.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <View style={styles.footerContainer}>
      {/* COLOANA 1: FURNIZOR */}
      <View style={styles.footerColFurnizor}>
        <Text style={styles.footerTitle}>
          Semnătură și ștampilă {'\n'} furnizor
        </Text>
        <View style={[styles.signatureLine, { marginTop: 20 }]} />
      </View>

      {/* COLOANA 2: DATE EXPEDIȚIE */}
      <View style={styles.footerColExpeditie}>
        <Text style={styles.footerTitle}>Date privind expediția</Text>
        <Text style={styles.footerText}>
          Delegat:{' '}
          <Text style={{ fontWeight: 'bold' }}>
            {data.delegate?.name || ''}
          </Text>
        </Text>
        <Text style={styles.footerText}>
          Transport:{' '}
          <Text style={{ fontWeight: 'bold' }}>
            {data.delegate?.vehicle}{' '}
            {data.delegate?.trailer ? `/ ${data.delegate.trailer}` : ''}
          </Text>
        </Text>
        <Text style={[styles.footerText, { marginTop: 2, fontSize: 5.5 }]}>
          Expedierea s-a efectuat în prezența noastră la data de: {currentDate}{' '}
          ora {currentTime}
        </Text>
        <Text style={[styles.footerText, { marginTop: 1 }]}>
          Semnăturile: _____________________
        </Text>
      </View>

      {/* COLOANA 3: TOTALURI ȘI PRIMIRE */}
      <View style={styles.footerColPrimire}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL:</Text>
          {Object.entries(totalsByUm).map(([um, val]) => (
            <Text key={um} style={styles.totalLabel}>
              {val.toFixed(2)} {um}
            </Text>
          ))}
        </View>

        <View>
          <Text style={styles.footerTitle}>Semnătura de primire</Text>
          <View style={styles.signatureLine} />
        </View>
      </View>
    </View>
  )
}

export const DeliveryNoteTemplate: React.FC<Props> = ({ data }) => {
  // 1. Verificăm dacă sunt mai mult de 6 produse
  const isLargeList = data.items.length > 5

  // Funcția de randare a conținutului
  const renderExemplar = (useFullPage: boolean, isLastInPage: boolean) => (
    <View
      style={[
        useFullPage ? styles.fullPageContainer : styles.halfPageContainer,
        !useFullPage && isLastInPage ? styles.lastContainer : {},
      ]}
      wrap={false}
    >
      <PdfHeader
        supplier={data.supplier}
        client={data.client}
        title='AVIZ DE ÎNSOȚIRE A MĂRFII'
        meta={{
          series: data.series,
          number: data.number,
          date: data.date,
          orderNumber: data.logistic?.orderNumber,
          deliveryNoteNumber: data.logistic?.deliveryNoteNumber,
          notes: data.notes,
          deliveryAddress: data.deliveryAddress
            ? `Str. ${data.deliveryAddress.strada} nr. ${data.deliveryAddress.numar}, ${data.deliveryAddress.localitate}, ${data.deliveryAddress.judet}`
            : undefined,
          contactPerson: data.deliveryAddress?.persoanaContact,
          contactPhone: data.deliveryAddress?.telefonContact,
        }}
      />

      {data.uitCode && (
        <View style={{ marginTop: 1, marginBottom: 1, paddingHorizontal: 2 }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold' }}>
            COD UIT (e-Transport): {data.uitCode}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <PdfDeliveryNoteTable items={data.items} />
      </View>

      <DeliveryNoteFooter data={data} />
    </View>
  )

  return (
    <Document title={`Aviz ${data.series}-${data.number}`}>
      {isLargeList ? (
        // CAZ A: LISTĂ LUNGĂ -> 2 PAGINI A4 SEPARATE
        <>
          <Page size='A4' style={styles.page}>
            {renderExemplar(true, true)}
          </Page>
          <Page size='A4' style={styles.page}>
            {renderExemplar(true, true)}
          </Page>
        </>
      ) : (
        // CAZ B: LISTĂ SCURTĂ -> 1 PAGINĂ A4 CU 2 EXEMPLARE (A5)
        <Page size='A4' style={styles.page}>
          {renderExemplar(false, false)}
          {renderExemplar(false, true)}
        </Page>
      )}
    </Document>
  )
}
