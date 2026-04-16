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
import { LOGO_SRC } from '../config/logo'

const styles = StyleSheet.create({
  headerLogo: {
    width: 150,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  docInfo: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'uppercase',
    color: PDF_COLORS.primary,
  },
  partiesBox: {
    marginBottom: 20,
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
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
    opacity: 0.15,
    transform: 'rotate(-45deg)',
  },
  partyText: { fontSize: 10, marginBottom: 5, lineHeight: 1.5 },
  partyBold: { fontWeight: 'bold' },
  paragraphBox: { marginBottom: 12 },
  paraTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  paraContent: {
    fontSize: 10,
    textAlign: 'justify',
    lineHeight: 1.5,
    marginTop: 0,
    whiteSpace: 'pre-wrap',
  },

  // Zona de semnături pregătită pentru viitor (e-semnătură)
  signatureBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
  },
  signCol: { width: '40%' },
  signTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 40 }, // Spațiu pentru semnătură
  signName: { fontSize: 9, fontWeight: 'bold', marginBottom: 2 },
  signDetails: { fontSize: 8, color: PDF_COLORS.textMuted },
})

interface ContractTemplateProps {
  data: PdfDocumentData
}

export const ContractTemplate = ({ data }: { data: PdfDocumentData }) => {
  const {
    series,
    number,
    date,
    supplier,
    client,
    contractData,
    type,
    parentInfo,
  } = data
  if (!contractData) return null

  return (
    <Document>
      <Page size='A4' style={commonStyles.page}>
        <View style={styles.watermarkContainer} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_SRC} style={styles.watermarkImage} />
        </View>
        <View>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_SRC} style={styles.headerLogo} />

          <Text style={styles.title}>
            {type === 'ADDENDUM'
              ? `ACT ADIȚIONAL NR. ${number}`
              : contractData.documentTitle}
          </Text>

          {/* INFO SUB TITLU */}
          <Text style={styles.docInfo}>
            {type === 'ADDENDUM'
              ? `la Contractul ${parentInfo} / ${new Date(date).toLocaleDateString('ro-RO')}`
              : `${series}-${number} / ${new Date(date).toLocaleDateString('ro-RO')}`}
          </Text>
        </View>

        {/* ANTET PĂRȚI CONTRACTANTE */}
        <View style={styles.partiesBox}>
          <Text
            style={{
              fontSize: 9,
              color: PDF_COLORS.textMuted,
              marginBottom: 10,
              fontWeight: 'bold',
            }}
          >
            1. Părțile contractante:
          </Text>

          {/* 1.1 VÂNZĂTOR */}
          <Text style={styles.partyText}>
            <Text style={styles.partyBold}>1.1. {supplier.name}</Text>, cu
            sediul social în localitatea {supplier.address?.localitate}, strada{' '}
            {supplier.address?.strada}, nr. {supplier.address?.numar}, județ{' '}
            {supplier.address?.judet}, adresa de corespondență electronică{' '}
            {supplier.email}, înmatriculată la Oficiul Registrului Comerțului
            sub nr. {supplier.regCom}, C.U.I. {supplier.cui}, având contul IBAN
            nr. {supplier.iban}, deschis la {supplier.bank}, existând și
            funcționând potrivit legislației din România, reprezentată de d-nul{' '}
            <Text style={styles.partyBold}>{supplier.representative}</Text>, cu
            funcția de {supplier.repFunction}, în calitate de{' '}
            <Text style={styles.partyBold}>Vânzător</Text>
          </Text>

          <Text
            style={[
              styles.partyText,
              styles.partyBold,
              { marginVertical: 5, textAlign: 'center' },
            ]}
          >
            și
          </Text>

          {/* 1.2 CUMPĂRĂTOR (Dinamic Juridica vs Fizica) - VERSIUNE FINALĂ */}
          <Text style={styles.partyText}>
            <Text style={styles.partyBold}>1.2. {client.name}</Text>,
            {client.clientType === 'Persoana fizica' ? (
              // Format pentru Persoana Fizica (DOAR CNP)
              <Text>
                {' '}
                domiciliat în loc. {client.address?.localitate}, strada{' '}
                {client.address?.strada}, nr. {client.address?.numar},județ{' '}
                {client.address?.judet}, identificat cu{' '}
                <Text style={styles.partyBold}>CNP {client.cnp}</Text>, telefon{' '}
                {client.phone}, email {client.email}, în calitate de{' '}
                <Text style={styles.partyBold}>Cumpărător</Text>.
              </Text>
            ) : (
              // Format pentru Persoana Juridica (Firma)
              <Text>
                {' '}
                cu sediul social în localitatea {client.address?.localitate},
                strada {client.address?.strada}, nr. {client.address?.numar},
                județ {client.address?.judet}, adresa de corespondență
                electronică {client.email}, înmatriculată la Registrul
                Comerțului sub nr. {client.regCom}, C.U.I. {client.cui}, având
                contul IBAN nr. {client.iban}, deschis la {client.bank},
                reprezentată de{' '}
                <Text style={styles.partyBold}>{client.representative}</Text>,
                în calitate de <Text style={styles.partyBold}>Cumpărător</Text>.
              </Text>
            )}
          </Text>

          {/* Boilerplate nou */}
          <Text
            style={{
              fontSize: 9,
              marginTop: 15,
              textAlign: 'justify',
              lineHeight: 1.4,
            }}
          >
            Denumite individual „Partea” și în mod colectiv „Părțile”, au
            convenit încheierea prezentului contract cadru de vânzare-cumpărare,
            în următoarele condiții:
          </Text>
        </View>

        {/* CLAUZE / PARAGRAFE */}
        {contractData.paragraphs.map((p, i) => {
          // Revenim FIX la logica ta.
          let splitIndex = p.content.length

          if (p.content.length > 110) {
            // Caută primul spațiu gol de DUPĂ caracterul 110, ca să nu despice cuvinte
            const nextSpace = p.content.indexOf(' ', 110)

            // Dacă a găsit un spațiu, taie acolo. Dacă nu, lasă-l întreg.
            splitIndex = nextSpace !== -1 ? nextSpace : p.content.length
          }

          const firstPart = p.content.substring(0, splitIndex)
          const restPart = p.content.substring(splitIndex)

          return (
            <View key={i} style={styles.paragraphBox}>
              {/* GRUPUL DE SIGURANȚĂ: Titlul + Primul rând. NU se va despărți între pagini */}
              <View wrap={false}>
                {p.title && p.title.trim() !== '' && (
                  <Text style={styles.paraTitle}>{p.title}</Text>
                )}
                <Text style={styles.paraContent}>{firstPart}</Text>
              </View>

              {/* RESTUL TEXTULUI: Continuă pe pagina curentă și previne spațiile uriașe */}
              {restPart.length > 0 && (
                <Text style={styles.paraContent}>{restPart}</Text>
              )}
            </View>
          )
        })}

        <Text style={{ fontSize: 10, marginTop: 20, marginBottom: 5 }}>
          Prezentul {type === 'ADDENDUM' ? 'act adițional' : 'contract'} a fost
          întocmit astăzi{' '}
          <Text style={styles.partyBold}>
            {new Date(date).toLocaleDateString('ro-RO')}
          </Text>
          , în 2 (două) exemplare, câte unul pentru fiecare parte.
        </Text>

        {/* ZONA DE SEMNĂTURI */}
        <View style={styles.signatureBox} wrap={false}>
          {/* COLOANĂ PRESTATOR */}
          <View style={styles.signCol}>
            <Text style={styles.signTitle}>PRESTATOR / VÂNZĂTOR</Text>
            <Text style={styles.signName}>{supplier.name}</Text>
            <Text style={styles.signDetails}>
              prin reprezentant{' '}
              <Text style={styles.partyBold}>{supplier.representative}</Text>
            </Text>
          </View>

          {/* COLOANĂ BENEFICIAR */}
          <View style={styles.signCol}>
            <Text style={styles.signTitle}>BENEFICIAR / CUMPĂRĂTOR</Text>
            <Text style={styles.signName}>{client.name}</Text>
            <Text style={styles.signDetails}>
              prin reprezentant{' '}
              <Text style={styles.partyBold}>{client.representative}</Text>
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
