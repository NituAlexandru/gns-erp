import {
  Html,
  Head,
  Preview,
  Tailwind,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Link as EmailLink,
} from '@react-email/components'
import { APP_NAME, SENDER_EMAIL } from '@/lib/constants'

interface WelcomeEmailProps {
  name: string
}

export const WelcomeEmailPreview = {
  name: 'John Doe',
}

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
  // pre-filled subject & body
  const mailto = [
    `mailto:${SENDER_EMAIL}`,
    `subject=${encodeURIComponent(`Cont neautorizat la ${APP_NAME}`)}`,
    `body=${encodeURIComponent(
      `Salut ${APP_NAME},\n\nSe pare că cineva a creat un cont folosind adresa mea de email, dar eu nu am făcut acest lucru. Vă rog să mă ajutați să sterg contul.\n\nMulțumesc!`
    )}`,
  ].join('?')

  return (
    <Html>
      <Head />
      <Preview>Bine ai venit la {APP_NAME}!</Preview>
      <Tailwind>
        <Body className='bg-white font-sans'>
          <Container className='p-4'>
            <Heading className='text-2xl mb-4'>Bine ai venit, {name}!</Heading>
            <Section className='mb-4'>
              <Text>Mulțumim că ți-ai creat un cont la noi.</Text>
              <Text>Ne bucurăm să te avem în comunitatea {APP_NAME}.</Text>
            </Section>
            <Section className='mt-8'>
              <Text className='mb-4'>
                Dacă nu ai creat tu contul, îl poți anula apăsând butonul de mai
                jos:
              </Text>
              <EmailLink
                href={mailto}
                className='inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-2 rounded transition'
              >
                Anulează contul
              </EmailLink>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
