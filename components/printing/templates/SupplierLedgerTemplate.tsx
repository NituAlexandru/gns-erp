import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { commonStyles } from '../config/styles'
import { PdfHeader } from '../atoms/PdfHeader'
import { PdfSupplierLedgerTable } from '../atoms/tables/PdfSupplierLedgerTable'

export const SupplierLedgerTemplate = ({ data }: { data: PdfDocumentData }) => {
  const ledger = data.ledgerData!
  const currentDate = new Date().toLocaleString('ro-RO')

  return (
    <Document title={`Fisa Furnizor - ${data.supplier.name}`}>
      <Page size='A4' style={commonStyles.page}>
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

        <PdfSupplierLedgerTable entries={ledger.entries} />

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
