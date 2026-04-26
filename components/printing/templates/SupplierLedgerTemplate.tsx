import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { commonStyles } from '../config/styles'
import { PdfHeader } from '../atoms/PdfHeader'
import { PdfSupplierLedgerTable } from '../atoms/tables/PdfSupplierLedgerTable'
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
})

export const SupplierLedgerTemplate = ({ data }: { data: PdfDocumentData }) => {
  const ledger = data.ledgerData!
  const currentDate = new Date().toLocaleString('ro-RO')

  return (
    <Document title={`Fisa Furnizor - ${data.supplier.name}`}>
      <Page size='A4' style={[commonStyles.page, { paddingBottom: 65 }]}>
        <View style={styles.watermarkContainer} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_SRC} style={styles.watermarkImage} />
        </View>
        <PdfHeader
          supplier={data.supplier}
          client={data.client}
          title='FISA DE FURNIZOR'
          meta={{
            series: '',
            number: '',
            date: data.date,
            currentBalance: ledger.summary.finalBalance,
          }}
        />

        <PdfSupplierLedgerTable
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
