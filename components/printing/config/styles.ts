import { StyleSheet, Font } from '@react-pdf/renderer'

// 1. ÎNREGISTRARE FONTURI LOCALE
// Calea '/fonts/...' se referă direct la folderul 'public/fonts' al proiectului tău.
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: '/fonts/Roboto-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src: '/fonts/Roboto-Bold.ttf',
      fontWeight: 'bold',
    },
    {
      src: '/fonts/Roboto-Italic.ttf',
      fontStyle: 'italic',
    },
  ],
})

export const PDF_COLORS = {
  primary: '#e11d48',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  background: '#ffffff',
  tableHeader: '#f1f5f9',
  accent: '#fff1f2',
}

export const commonStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto', // <--- Acum folosim fontul local Roboto
    fontSize: 9,
    color: PDF_COLORS.text,
    lineHeight: 1.5,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.border,
    paddingBottom: 10,
  },
  h1: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PDF_COLORS.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  h2: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    fontSize: 8,
    color: PDF_COLORS.textMuted,
    marginBottom: 1,
  },
  value: {
    fontSize: 9,
    marginBottom: 3,
  },
  bold: {
    fontWeight: 'bold',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flexDirection: 'column' },
})
