'use client'

import { useState } from 'react'
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { ReportCard } from './report-card'
import { InventoryReportDialog } from './inventory-report-dialog'
import { AgentSalesReportDialog } from './agent-sales-report-dialog'

export function ReportsGrid({ reports }: { reports: ReportDefinition[] }) {
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(
    null,
  )

  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isAgentSalesOpen, setIsAgentSalesOpen] = useState(false)

  const handleSelectReport = (report: ReportDefinition) => {
    setSelectedReport(report)

    // 3. LOGICA DE DESCHIDERE A MODALULUI CORECT
    if (report.id === 'inventory-valuation') {
      setIsInventoryOpen(true)
    } else if (report.id === 'agent-sales-performance') {
      setIsAgentSalesOpen(true)
    } else {
      console.log('Acest raport încă nu are modal implementat.')
    }
  }

  if (reports.length === 0) {
    return (
      <div className='p-8 text-center text-muted-foreground'>
        Nu există rapoarte în această categorie momentan.
      </div>
    )
  }

  return (
    <>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onSelect={handleSelectReport}
          />
        ))}
      </div>

      {/* Modal Inventar */}
      {selectedReport && selectedReport.id === 'inventory-valuation' && (
        <InventoryReportDialog
          open={isInventoryOpen}
          onOpenChange={setIsInventoryOpen}
          report={selectedReport}
        />
      )}

      {/* 4. MODAL VÂNZĂRI AGENTI */}
      {selectedReport && selectedReport.id === 'agent-sales-performance' && (
        <AgentSalesReportDialog
          open={isAgentSalesOpen}
          onOpenChange={setIsAgentSalesOpen}
          report={selectedReport}
        />
      )}
    </>
  )
}
