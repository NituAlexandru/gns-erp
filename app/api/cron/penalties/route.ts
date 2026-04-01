import { NextResponse } from 'next/server'
import {
  getPendingPenaltiesList,
  getPenaltyCalculationContext,
} from '@/lib/db/modules/financial/penalties/penalty.actions'
import { createPenaltyInvoiceFromOverdue } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { isBusinessDay } from '@/lib/deliveryDates'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // 1. SECURITATE: Doar Vercel are voie să apeleze acest endpoint
    const authHeader = request.headers.get('authorization')
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      console.warn('[CRON] Tentativă de acces neautorizat respinsă.')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. VERIFICARE "KILL SWITCH" (Butonul On/Off din Setări)
    const context = await getPenaltyCalculationContext()
    if (!context.isAutoBillingEnabled) {
      console.log(
        '[CRON] Facturarea automată este OPRITĂ din interfață. Se anulează execuția.',
      )
      return NextResponse.json({
        message: 'Auto-billing disabled in settings. Skipping execution.',
        executed: false,
      })
    }

    // 2.5 VERIFICARE SĂRBĂTORI LEGALE (Folosind date-holidays din utils)
    const now = new Date()
    if (!isBusinessDay(now)) {
      console.log(
        '[CRON] Astăzi este weekend sau sărbătoare legală în RO. Se ignoră execuția.',
      )
      return NextResponse.json({
        message:
          'Azi este zi nelucrătoare. Se amână facturarea automată pentru următoarea zi de muncă.',
        executed: false,
      })
    }

    console.log('[CRON] START: Generare automată a facturilor de penalități...')

    // 3. PRELUARE DATE (Aducem doar facturile cu penalitate calculată > 0)
    const pendingResult = await getPendingPenaltiesList()

    if (
      !pendingResult.success ||
      !pendingResult.data ||
      pendingResult.data.length === 0
    ) {
      console.log(
        '[CRON] STOP: Nu există penalități restante de facturat astăzi.',
      )
      return NextResponse.json({
        message: 'Nu există penalități de facturat azi.',
        executed: true,
      })
    }

    // 4. GRUPARE PE CLIENȚI (Dacă un client are 3 facturi restante, îi facem o singură factură PEN)
    const clientGroups = new Map<string, any[]>()
    pendingResult.data.forEach((penalty) => {
      // Filtrăm extra: Ne asigurăm că suma e mai mare de 0 (sistem de siguranță)
      if (penalty.penaltyAmount > 0) {
        if (!clientGroups.has(penalty.clientId)) {
          clientGroups.set(penalty.clientId, [])
        }
        clientGroups.get(penalty.clientId)!.push(penalty)
      }
    })

    if (clientGroups.size === 0) {
      return NextResponse.json({
        message: 'Penalitățile calculate sunt 0. Nu s-a emis nimic.',
        executed: true,
      })
    }

    // 5. EMITEREA FACTURILOR (Câte o factură PEN pentru fiecare client din listă)
    let successCount = 0
    let errorCount = 0

    for (const [clientId, invoices] of clientGroups.entries()) {
      const totalPenaltyForClient = invoices.reduce(
        (sum, inv) => sum + inv.penaltyAmount,
        0,
      )
      if (totalPenaltyForClient < 100) {
        console.log(
          `[CRON] Skip client ${clientId}: Suma totală (${totalPenaltyForClient} RON) este sub pragul minim de 100 RON.`,
        )
        continue 
      }

      try {
        const payload = invoices.map((i) => ({
          invoiceId: i.invoiceId,
          seriesName: i.seriesName,
          invoiceNumber: i.documentNumber,
          invoiceDate: i.dueDate, // Pasăm scadența pt logica din backend
          penaltyAmount: i.penaltyAmount,
          percentage: i.appliedPercentage,
          billedDays: i.unbilledDays,
        }))

        // Apelăm funcția de facturare. Lasăm initiatorId gol ca să fie facturat de "GenesisERP" automat
        await createPenaltyInvoiceFromOverdue(clientId, payload)
        successCount++
      } catch (err) {
        console.error(
          `[CRON] Eroare la crearea facturii PEN pentru clientul ${clientId}:`,
          err,
        )
        errorCount++
      }
    }

    console.log(
      `[CRON] SUCCES TOTAL! S-au emis ${successCount} facturi PEN. Erori: ${errorCount}.`,
    )

    return NextResponse.json({
      message: 'Procesare penalități finalizată cu succes.',
      stats: { successCount, errorCount },
      executed: true,
    })
  } catch (error) {
    console.error('[CRON] EROARE CRITICĂ DE SISTEM:', error)
    return NextResponse.json(
      { error: 'Eroare internă a serverului în timpul rulării cron-ului.' },
      { status: 500 },
    )
  }
}
