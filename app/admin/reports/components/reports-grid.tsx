'use client'

import { useState } from 'react'
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { ReportCard } from './report-card'
import { InventoryReportDialog } from './inventory-report-dialog'

export function ReportsGrid({ reports }: { reports: ReportDefinition[] }) {
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(
    null,
  )
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)

  const handleSelectReport = (report: ReportDefinition) => {
    if (report.category === 'inventory') {
      setSelectedReport(report)
      setIsInventoryOpen(true)
    } else {
      // Aici vei pune logică pentru Client/Furnizor când le faci
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

      {selectedReport && selectedReport.category === 'inventory' && (
        <InventoryReportDialog
          open={isInventoryOpen}
          onOpenChange={setIsInventoryOpen}
          report={selectedReport}
        />
      )}
    </>
  )
}
