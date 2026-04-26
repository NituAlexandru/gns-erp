import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { commonStyles, PDF_COLORS } from '../config/styles'
import { PdfHeader } from '../atoms/PdfHeader'
import { PdfClientLedgerTable } from '../atoms/tables/PdfClientLedgerTable'
import { LOGO_SRC } from '../config/logo'

const styles = StyleSheet.create({
  watermarkContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  watermarkImage: {
    width: '100%',
    opacity: 0.1,
    transform: 'rotate(-45deg)',
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  card: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    width: 120,
  },
  cardLabel: {
    fontSize: 7,
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  cardValue: { fontSize: 10, fontWeight: 'bold', color: '#0f172a' },
})

export const ClientLedgerTemplate = ({ data }: { data: PdfDocumentData }) => {
  const ledger = data.ledgerData!

  return (
    <Document title={`Fisa Client - ${data.client.name}`}>
      <Page size='A4' style={[commonStyles.page, { paddingBottom: 65 }]}>
        <View style={styles.watermarkContainer} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_SRC} style={styles.watermarkImage} />
        </View>
        <PdfHeader
          supplier={data.supplier}
          client={data.client}
          title='FISA DE CLIENT'
          meta={{
            series: '',
            number: '',
            date: data.date,
            currentBalance: ledger.summary.finalBalance,
          }}
        />

        <PdfClientLedgerTable
          entries={ledger.entries}
          totals={ledger.summary as any}
          period={ledger.period}
        />

        <View
          style={{
            position: 'absolute',
            bottom: 30,
            left: 30,
            right: 30,
            textAlign: 'center',
          }}
          fixed
        >
          <Text style={{ fontSize: 8, color: '#94a3b8' }}>
            Generat la data de {new Date().toLocaleString('ro-RO')}
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </Text>
        </View>
      </Page>
    </Document>
  )
}
