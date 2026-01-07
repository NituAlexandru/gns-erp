// components/printing/templates/NirTemplate.tsx
import { Document, Page, View, StyleSheet, Text } from '@react-pdf/renderer'
import { PdfHeader } from '../atoms/PdfHeader'
import { PdfNirTable } from '../atoms/tables/PdfNirTable'
import { formatCurrency } from '@/lib/utils' // Importă funcția ta

const styles = StyleSheet.create({
  page: {
    padding: 20,
    paddingBottom: 80, // Spațiu asigurat pentru footer-ul absolut
    fontFamily: 'Roboto',
    position: 'relative',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerCol: { width: '33%', fontSize: 8 },
  totalBox: {
    backgroundColor: '#f8fafc',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minWidth: 180,
  },
})

export const NirTemplate = ({ data }: { data: any }) => (
  <Document title={`NIR ${data.series}-${data.number}`}>
    <Page size='A4' orientation='landscape' style={styles.page}>
      <PdfHeader
        supplier={data.supplier}
        client={data.client}
        title='NOTA RECEPTIE SI CONSTATARE DIFERENTE'
        meta={
          {
            series: data.series,
            number: data.number,
            date: data.date,
            location: data.logistic.location,
            accompanyingDocs: data.logistic.accompanyingDocs,
            currency: data.totals.currency,
          } as any
        }
      />

      <View
        style={{
          marginTop: 10,
          marginBottom: 10,
          fontSize: 9,
          lineHeight: 1.4,
        }}
      >
        <Text>
          Subsemnatii, membrii comisiei de receptie, am procedat la
          receptionarea valorilor materiale furnizate de
          <Text style={{ fontWeight: 'bold' }}> {data.supplier.name} </Text>
          livrate cu auto nr.
          <Text style={{ fontWeight: 'bold' }}>
            {' '}
            {data.logistic.carNumber || '..........'},{' '}
          </Text>
          delegat/i
          <Text style={{ fontWeight: 'bold' }}>
            {' '}
            {data.logistic.driverName || '..........'},{' '}
          </Text>
          documente insotitoare
          <Text style={{ fontWeight: 'bold' }}>
            {' '}
            {data.logistic.accompanyingDocs || '..........'},{' '}
          </Text>
          constatandu-se urmatoarele:
        </Text>
      </View>

      <PdfNirTable items={data.items} />

      {/* În NirTemplate.tsx, secțiunea de totaluri din partea dreaptă */}
      <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
        <View style={styles.totalBox}>
          {/* TOTAL NET ADAUGAT AICI */}
          <Text
            style={{
              fontSize: 8,
              color: '#475569',
              textAlign: 'right',
              marginBottom: 2,
            }}
          >
            Total Net (fără TVA): {formatCurrency(data.totals.subtotal)}
          </Text>
          {data.totals.transportValue > 0 && (
            <Text
              style={{
                fontSize: 7,
                color: '#64748b',
                textAlign: 'right',
                marginTop: 0,
              }}
            >
              Din care Transport: {formatCurrency(data.totals.transportValue)}
            </Text>
          )}
          <Text style={{ fontSize: 9, fontWeight: 'bold', textAlign: 'right' }}>
            TOTAL GENERAL (cu TVA): {formatCurrency(data.totals.grandTotal)}
          </Text>
        </View>
      </View>

      {/* Footer fixat la baza paginii */}
      <View style={styles.footer} fixed>
        {/* Coloana 1: Întocmit de și Membri comisie */}
        <View style={styles.footerCol}>
          <Text style={{ marginBottom: 2 }}>
            Întocmit de:{' '}
            <Text style={{ fontWeight: 'bold' }}>
              {data.logistic.receivedBy}
            </Text>{' '}
          </Text>
          <Text style={{ fontWeight: 'bold', marginTop: 5, marginBottom: 5 }}>
            Membri comisiei (Nume, Prenume, Semnătura):
          </Text>
          <Text style={{ marginBottom: 3 }}>
            1.
            ______________________________________________________________________
          </Text>
          <Text style={{ marginBottom: 3 }}>
            2.
            ______________________________________________________________________
          </Text>
          <Text style={{ marginBottom: 3 }}>
            3.
            ______________________________________________________________________
          </Text>
        </View>

        {/* Coloana 2: Gestionar */}
        <View style={[styles.footerCol, { alignItems: 'center' }]}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
            GESTIONAR:
          </Text>
          <Text>{data.logistic.receivedBy}</Text>
          <Text style={{ marginTop: 10 }}>Semnatura: __________________</Text>
        </View>

        {/* Coloana 3: Data și Paginația */}
        <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
          <Text style={{ fontWeight: 'bold', marginBottom: 20 }}>
            Data: {new Date(data.date).toLocaleDateString('ro-RO')}
          </Text>
        </View>
      </View>
    </Page>
  </Document>
)
