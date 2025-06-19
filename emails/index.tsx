import { Resend } from 'resend'
import { ADMIN_EMAIL, SENDER_EMAIL, SENDER_NAME } from '@/lib/constants'
import WelcomeEmail from './welcome'

const resend = new Resend(process.env.RESEND_API_KEY as string)

export async function sendWelcomeEmail(user: {
  _id: string
  name: string
  email: string
}) {
  const recipient =
    process.env.NODE_ENV === 'production' ? user.email : ADMIN_EMAIL // în dev toate mailurile merg la ADMIN_EMAIL

  // console.log('[EMAIL] ▶ sendWelcomeEmail()', {
  //   from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
  //   to: recipient,
  // })

  const res = await resend.emails.send({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: recipient,
    subject: `Bine ai venit, ${user.name}!`,
    react: <WelcomeEmail name={user.name} />,
  })

  // console.log('[EMAIL] ◀ Resend response:', res)
  return res
}
