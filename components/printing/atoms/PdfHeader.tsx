import React from 'react'
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import { PDF_COLORS } from '../config/styles'
import { PdfEntity } from '@/lib/db/modules/printing/printing.types'
import { LOGO_SRC } from '../config/logo'

// 1. MODIFICARE INTERFAȚĂ: Adăugăm 'meta' pentru datele din coloana din mijloc
interface PdfHeaderProps {
  supplier: PdfEntity
  client: PdfEntity
  meta: {
    series?: string
    number: string
    date: string
    dueDate?: string
    orderNumber?: string
    deliveryNoteNumber?: string
    notes?: string
    invoiceType?: string
    deliveryAddress?: string
    contactPerson?: string
    contactPhone?: string
    location?: string
    currency?: string
    accompanyingDocs?: string
    carNumber?: string
    driverName?: string
    currentBalance?: number
  }
  title: string
}

const styles = StyleSheet.create({
  mainContainer: {
    flexDirection: 'column',
    marginBottom: 0,
    width: '100%',
  },
  // 2. MODIFICARE STIL: Reducem spațiul mort de sub logo (de la 15 la 4)
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  logo: {
    width: 150,
    height: 60,
    objectFit: 'contain',
    paddingLeft: 1,
  },
  docTitle: {
    fontSize: 18,
    marginTop: 10,
    fontWeight: 'heavy',
    color: PDF_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'right',
  },

  entitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10, // Reducem gap-ul ca să încapă 3 coloane
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },
  colLeft: {
    width: '38%',
    flexDirection: 'column',
  },

  // COLOANA CENTRU (Detalii) - 30%
  colCenter: {
    width: '27%',
    flexDirection: 'column',
  },

  // COLOANA DREAPTA (Client) - 35%
  colRight: {
    width: '35%',
    flexDirection: 'column',
  },
  sectionLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: PDF_COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 1,
    width: '100%',
  },
  companyName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PDF_COLORS.text,
    marginBottom: 3,
  },
  details: {
    fontSize: 7,
    color: '#475569',
    marginBottom: 0,
    lineHeight: 1.1,
  },
  bold: { fontWeight: 'bold', color: '#334155' },
})

export const PdfHeader: React.FC<PdfHeaderProps> = ({
  supplier,
  client,
  meta, // Preluăm meta
  title,
}) => {
  const formatAddress = (addr: PdfEntity['address']) => {
    // Cream un array doar cu elementele care au valoare
    const parts = [
      addr.strada ? `Str. ${addr.strada}` : '',
      addr.numar ? `nr. ${addr.numar}` : '',
      addr.alteDetalii || '',
      addr.localitate || '',
      addr.judet || '',
    ].filter((part) => part.trim() !== '')

    return parts.join(', ') // Punem virgula doar între elemente existente
  }

  const formatData = (d: string) => new Date(d).toLocaleDateString('ro-RO')

  const getDocTypeLabel = (type?: string) => {
    if (!type || type === 'STANDARD') return null
    if (type === 'STANDARD') return 'FACTURĂ FISCALĂ'
    if (type === 'STORNO') return 'FACTURĂ STORNO'
    if (type === 'AVANS') return 'FACTURĂ AVANS'
    if (type === 'PROFORMA') return 'PROFORMĂ'
    return type
  }

  const docTypeLabel = getDocTypeLabel(meta.invoiceType)

  // Helper pentru afișare date entitate
  const EntityDetails = ({ data }: { data: PdfEntity }) => (
    <>
      <Text style={styles.companyName}>{data.name}</Text>
      <Text style={styles.details}>
        <Text style={styles.bold}>
          {data.cui && data.cui.length > 12 ? 'CNP:' : 'CIF:'}
        </Text>{' '}
        {data.cui}
      </Text>
      {!title.toUpperCase().includes('RECEPTIE') && data.regCom && (
        <Text style={styles.details}>
          <Text style={styles.bold}>Nr. reg. com.:</Text> {data.regCom}
        </Text>
      )}
      {!title.toUpperCase().includes('RECEPTIE') && (
        <Text style={styles.details}>
          <Text style={styles.bold}>Sediu:</Text> {formatAddress(data.address)}
        </Text>
      )}
      {data.bank && (
        <Text style={styles.details}>
          <Text style={styles.bold}>Banca:</Text> {data.bank}
        </Text>
      )}
      {data.iban && (
        <Text style={styles.details}>
          <Text style={styles.bold}>IBAN:</Text> {data.iban}
        </Text>
      )}
      {data.capitalSocial && (
        <Text style={styles.details}>
          <Text style={styles.bold}>Cap. Soc:</Text> {data.capitalSocial}
        </Text>
      )}
      {/* SECTIUNEA CONTACT, TELEFON, EMAIL */}
      {(data.phone || data.email || data.contactPerson) && (
        <View>
          {data.contactPerson && (
            <Text style={styles.details}>
              <Text style={styles.bold}>Contact:</Text> {data.contactPerson}
            </Text>
          )}

          {/* Telefon si Email pe acelasi rand */}
          {(data.phone || data.email) && (
            <Text style={styles.details}>
              {data.phone && (
                <>
                  <Text style={styles.bold}>Tel:</Text> {data.phone}
                </>
              )}

              {data.phone && data.email && ' | '}

              {data.email && (
                <>
                  <Text style={styles.bold}>Email:</Text> {data.email}
                </>
              )}
            </Text>
          )}
        </View>
      )}
    </>
  )

  return (
    <View style={styles.mainContainer}>
      <View style={styles.topRow}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={LOGO_SRC} style={styles.logo} />
        <Text style={styles.docTitle}>{title}</Text>
      </View>

      <View style={styles.entitiesRow}>
        {/* FURNIZOR: 35% */}
        <View style={styles.colLeft}>
          {/* Text aliniat STÂNGA, dar linia e 100% */}
          <Text style={[styles.sectionLabel, { textAlign: 'left' }]}>
            Furnizor
          </Text>
          <EntityDetails data={supplier} />
        </View>

        {/* DETALII: 30% */}
        <View style={styles.colCenter}>
          {/* Text aliniat CENTRU, dar linia e 100% */}
          <Text style={[styles.sectionLabel, { textAlign: 'center' }]}>
            Detalii Document
          </Text>
          <View style={{ width: '100%', paddingLeft: 30 }}>
            {docTypeLabel && (
              <Text
                style={[
                  styles.details,
                  {
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  },
                ]}
              >
                {docTypeLabel}
              </Text>
            )}
            {(meta.series || meta.number) && (
              <Text style={styles.details}>
                <Text style={styles.bold}>Serie:</Text> {meta.series}{' '}
                <Text style={styles.bold}>Număr:</Text> {meta.number}
              </Text>
            )}

            <Text style={styles.details}>
              <Text style={styles.bold}>Data Emiterii:</Text>{' '}
              {formatData(meta.date)}
            </Text>
            {meta.currentBalance !== undefined && (
              <View
                style={{
                  marginTop: 5,
                  padding: 6,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 4,
                  alignItems: 'flex-start',
                }}
              >
                <Text
                  style={{
                    fontSize: 6,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  SOLD ACTUAL
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: meta.currentBalance > 0 ? '#dc2626' : '#16a34a',
                  }}
                >
                  {new Intl.NumberFormat('ro-RO', {
                    style: 'currency',
                    currency: 'RON',
                  }).format(meta.currentBalance)}
                </Text>
              </View>
            )}

            {meta.dueDate && (
              <Text style={styles.details}>
                <Text style={styles.bold}>Dată Scadență:</Text>{' '}
                {formatData(meta.dueDate)}
              </Text>
            )}
            {meta.orderNumber && (
              <Text style={styles.details}>
                <Text style={styles.bold}>Nr. Comandă:</Text> {meta.orderNumber}
              </Text>
            )}

            {meta.notes && (
              <View
                style={{
                  marginTop: 3,
                  paddingTop: 2,
                  borderTopWidth: 0.5,
                  borderTopColor: '#cbd5e1',
                  height: 24,
                  overflow: 'hidden',
                }}
              >
                <Text
                  style={[styles.details, { fontWeight: 'bold', fontSize: 6 }]}
                >
                  Mențiuni:
                </Text>
                <Text
                  style={[
                    styles.details,
                    {
                      fontSize: 5.5,
                      fontStyle: 'italic',
                      lineHeight: 1.1,
                    },
                  ]}
                >
                  {/* Tăiem textul manual la 130 caractere ca să fim siguri că intră */}
                  {meta.notes.length > 130
                    ? meta.notes.substring(0, 130) + '...'
                    : meta.notes}
                </Text>
              </View>
            )}
            {title.toUpperCase().includes('RECEPTIE') && (
              <>
                <Text style={styles.details}>
                  <Text style={styles.bold}>Moneda:</Text>{' '}
                  {meta.currency || 'RON'}
                </Text>
                <Text style={styles.details}>
                  <Text style={styles.bold}>Gestiunea:</Text>{' '}
                  {meta.location || '-'}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* CLIENT: 35% */}
        <View style={styles.colRight}>
          {/* Text aliniat DREAPTA, dar linia e 100% */}
          <Text style={[styles.sectionLabel, { textAlign: 'right' }]}>
            Client (Beneficiar)
          </Text>
          {/* Conținutul rămâne aliniat standard (stânga), așa cum ai cerut */}
          <EntityDetails data={client} />
          {/* AFIȘARE DATE CONTACT CLIENT */}
          {(meta.contactPerson || meta.contactPhone) && (
            <View
              style={{
                marginTop: 1,
                borderTopWidth: 0.5,
                borderTopColor: '#f1f5f9',
                paddingTop: 1,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              {meta.contactPerson && (
                <Text style={[styles.details, { marginBottom: 0 }]}>
                  <Text style={styles.bold}>Pers. contact:</Text>{' '}
                  {meta.contactPerson}
                </Text>
              )}

              {meta.contactPerson && meta.contactPhone && (
                <Text
                  style={[
                    styles.details,
                    { color: '#cbd5e1', marginBottom: 0 },
                  ]}
                >
                  |
                </Text>
              )}

              {meta.contactPhone && (
                <Text style={[styles.details, { marginBottom: 0 }]}>
                  <Text style={styles.bold}>Tel.:</Text> {meta.contactPhone}
                </Text>
              )}
            </View>
          )}

          {/* AFIȘARE ADRESĂ LIVRARE */}
          {meta.deliveryAddress && (
            <View
              style={{
                marginTop: 2, // Redus de la 3
                backgroundColor: '#f8fafc',
                padding: 2, // Redus de la 3
                borderLeftWidth: 2,
                borderLeftColor: PDF_COLORS.primary,
              }}
            >
              <Text
                style={[
                  styles.details,
                  {
                    color: PDF_COLORS.primary,
                    fontWeight: 'bold',
                    fontSize: 6,
                  },
                ]}
              >
                ADRESĂ LIVRARE:
              </Text>
              <Text style={[styles.details, { fontSize: 6.5, lineHeight: 1 }]}>
                {meta.deliveryAddress}
              </Text>
            </View>
          )}

          {title.includes('NIR') && (
            <View
              style={{
                marginTop: 4,
                borderTopWidth: 0.5,
                borderTopColor: '#e2e8f0',
                paddingTop: 2,
              }}
            >
              <Text
                style={[
                  styles.details,
                  { color: PDF_COLORS.primary, fontWeight: 'bold' },
                ]}
              >
                GESTIUNE: {meta.location}
              </Text>
              {meta.accompanyingDocs && (
                <Text style={[styles.details, { fontSize: 6 }]}>
                  <Text style={styles.bold}>Documente:</Text>{' '}
                  {meta.accompanyingDocs}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
