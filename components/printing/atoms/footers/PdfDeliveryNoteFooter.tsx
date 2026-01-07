import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'

const footerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginTop: 5,
    paddingTop: 5,
    minHeight: 60,
  },
  section: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    padding: 4,
  },
  title: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  content: { fontSize: 7 },
  signatureBox: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    width: '80%',
  },
})

export const PdfDeliveryNoteFooter = ({ data }: { data: any }) => (
  <View style={footerStyles.container}>
    <View style={footerStyles.section}>
      <Text style={footerStyles.title}>Date privind expediția</Text>
      <Text style={footerStyles.content}>Delegat: {data.delegate?.name}</Text>
      <Text style={footerStyles.content}>
        Auto: {data.delegate?.vehicle} {data.delegate?.trailer}
      </Text>
    </View>
    <View style={footerStyles.section}>
      <Text style={footerStyles.title}>Semnătura de primire</Text>
      <View style={footerStyles.signatureBox} />
      <Text style={{ fontSize: 6, marginTop: 2 }}>
        Data: .........................
      </Text>
    </View>
    <View style={[footerStyles.section, { borderRightWidth: 0 }]}>
      <Text style={footerStyles.title}>Mențiuni</Text>
      <Text style={footerStyles.content}>
        {data.notes || 'Marfa a fost recepționată integral.'}
      </Text>
    </View>
  </View>
)
