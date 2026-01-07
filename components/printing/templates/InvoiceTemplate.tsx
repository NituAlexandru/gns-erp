import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { commonStyles, PDF_COLORS } from '../config/styles'
import { PdfHeader } from '../atoms/PdfHeader'
import { PdfInvoiceTable } from '../atoms/tables/PdfInvoiceTable'
import { PdfFooter } from '../atoms/footers/PdfFooter'

interface InvoiceTemplateProps {
  data: PdfDocumentData
}

const styles = StyleSheet.create({
  // Secțiunea Detalii & Referințe
  metaContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaCol: {
    width: '50%',
    flexDirection: 'column',
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 8,
    color: PDF_COLORS.textMuted,
    width: 70,
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: 9,
    color: PDF_COLORS.text,
    flex: 1,
  },

  // Secțiunea Footer (Expediție)
  footerContainer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    flexDirection: 'row',
  },
  footerSection: {
    width: '60%',
  },
  footerTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: PDF_COLORS.textMuted,
    marginBottom: 5,
  },
  signatureSection: {
    width: '40%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 50,
  },
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
  },
})

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data }) => {
  const DetailRow = ({ label, value }: { label: string; value?: string }) => {
    if (!value) return null
    return (
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    )
  }

  const getTitle = () => {
    const type = (data as any).invoiceType
    if (data.type !== 'INVOICE') return 'DOCUMENT'

    switch (type) {
      case 'STORNO':
        return 'FACTURĂ STORNO'
      case 'AVANS':
        return 'FACTURĂ AVANS'
      case 'PROFORMA':
        return 'PROFORMĂ'
      case 'STANDARD':
      default:
        return 'FACTURĂ FISCALĂ'
    }
  }

  const docTitle = getTitle()

  return (
    <Document>
      <Page size='A4' style={commonStyles.page}>
        {/* 1. HEADER */}
        <PdfHeader
          supplier={data.supplier}
          client={data.client}
          title={docTitle}
          meta={{
            series: data.series,
            number: data.number,
            date: data.date,
            dueDate: data.dueDate,
            orderNumber: data.logistic?.orderNumber,
            deliveryNoteNumber: data.logistic?.deliveryNoteNumber,
            invoiceType: (data as any).invoiceType,
          }}
        />

        {/* 3. TABEL PRODUSE - FOLOSIM COMPONENTA CUSTOM */}
        {/* Asigură-te ca data.items și data.totals au proprietățile cerute de PdfInvoiceTable */}
        <View>
          <PdfInvoiceTable
            items={data.items as any}
            totals={data.totals as any}
          />
        </View>
        <View style={{ flexGrow: 1 }} />
        {/* 4. FOOTER */}
        <PdfFooter data={data} />
      </Page>
    </Document>
  )
}
