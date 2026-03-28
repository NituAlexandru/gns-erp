'use client'

import { useState } from 'react'
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { ReportCard } from './report-card'
import { InventoryReportDialog } from './inventory-report-dialog'
import { AgentSalesReportDialog } from './agent-sales-report-dialog'
import { InventoryHistoryDialog } from './inventory-history-dialog'
import { ProductMarginReportDialog } from './product-margin-report-dialog'
import { ProductHistoryReportDialog } from './product-history-report-dialog'
import { SalesPeriodReportDialog } from './sales-period-report-dialog'
import { ClientBalancesReportDialog } from './clients/ClientBalancesReportDialog'

export function ReportsGrid({ reports }: { reports: ReportDefinition[] }) {
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(
    null,
  )
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isInventoryHistoryOpen, setIsInventoryHistoryOpen] = useState(false)
  const [isAgentSalesOpen, setIsAgentSalesOpen] = useState(false)
  const [isProductMarginOpen, setIsProductMarginOpen] = useState(false)
  const [isProductHistoryOpen, setIsProductHistoryOpen] = useState(false)
  const [isSalesPeriodOpen, setIsSalesPeriodOpen] = useState(false)
  const [isClientBalancesOpen, setIsClientBalancesOpen] = useState(false)

  const handleSelectReport = (report: ReportDefinition) => {
    setSelectedReport(report)

    // 3. LOGICA DE DESCHIDERE A MODALULUI CORECT
    if (report.id === 'inventory-valuation') {
      setIsInventoryOpen(true)
    } else if (report.id === 'inventory-history') {
      setIsInventoryHistoryOpen(true)
    } else if (report.id === 'agent-sales-performance') {
      setIsAgentSalesOpen(true)
    } else if (report.id === 'product-margins') {
      setIsProductMarginOpen(true)
    } else if (report.id === 'product-history') {
      setIsProductHistoryOpen(true)
    } else if (report.id === 'sales-period') {
      setIsSalesPeriodOpen(true)
    } else if (report.id === 'client-balances') {
      setIsClientBalancesOpen(true)
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

      {/* Modal Istoric Inventar */}
      {selectedReport && selectedReport.id === 'inventory-history' && (
        <InventoryHistoryDialog
          open={isInventoryHistoryOpen}
          onOpenChange={setIsInventoryHistoryOpen}
          report={selectedReport}
        />
      )}

      {/* MODAL VÂNZĂRI AGENTI */}
      {selectedReport && selectedReport.id === 'agent-sales-performance' && (
        <AgentSalesReportDialog
          open={isAgentSalesOpen}
          onOpenChange={setIsAgentSalesOpen}
          report={selectedReport}
        />
      )}
      {/* MODAL MARJE PRODUSE */}
      {selectedReport && selectedReport.id === 'product-margins' && (
        <ProductMarginReportDialog
          open={isProductMarginOpen}
          onOpenChange={setIsProductMarginOpen}
          report={selectedReport}
        />
      )}
      {selectedReport && selectedReport.id === 'product-history' && (
        <ProductHistoryReportDialog
          open={isProductHistoryOpen}
          onOpenChange={setIsProductHistoryOpen}
          report={selectedReport}
        />
      )}
      {selectedReport && selectedReport.id === 'sales-period' && (
        <SalesPeriodReportDialog
          open={isSalesPeriodOpen}
          onOpenChange={setIsSalesPeriodOpen}
          report={selectedReport}
        />
      )}
      {/* Solduri clienti */}
      {selectedReport && selectedReport.id === 'client-balances' && (
        <ClientBalancesReportDialog
          open={isClientBalancesOpen}
          onOpenChange={setIsClientBalancesOpen}
          report={selectedReport}
        />
      )}
    </>
  )
}
