'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Download, Print, CreditCard, Calendar, Building, Mail, Phone } from 'lucide-react'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type Invoice = Database['public']['Tables']['client_invoices']['Row']

interface InvoiceViewerProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

export function InvoiceViewer({ invoice, open, onOpenChange }: InvoiceViewerProps) {
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [clientInfo, setClientInfo] = useState<any>(null)

  useEffect(() => {
    if (open && invoice) {
      loadInvoiceDetails()
    }
  }, [open, invoice])

  const loadInvoiceDetails = async () => {
    try {
      // Load company and client information
      const [companyRes, clientRes] = await Promise.all([
        fetch('/api/company-info'),
        fetch(`/api/clients/${invoice.client_id}`)
      ])
      
      const company = await companyRes.json()
      const client = await clientRes.json()
      
      setCompanyInfo(company)
      setClientInfo(client)
    } catch (error) {
      console.error('Failed to load invoice details:', error)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.invoice_number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download invoice:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const lineItems: LineItem[] = Array.isArray(invoice.line_items) 
    ? invoice.line_items as LineItem[]
    : []

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const taxRate = 0.08 // This would be configurable
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'viewed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Invoice #{invoice.invoice_number}</DialogTitle>
              <DialogDescription className="mt-1">
                Created on {format(new Date(invoice.created_at), 'MMMM d, yyyy')}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status.toUpperCase()}
              </Badge>
              {invoice.status === 'overdue' && (
                <Badge variant="destructive">OVERDUE</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="font-semibold text-lg mb-3">From</h3>
              <div className="space-y-2">
                <h4 className="font-medium">{companyInfo?.name || 'Your Company Name'}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{companyInfo?.address || '123 Business St'}</p>
                  <p>{companyInfo?.city || 'City'}, {companyInfo?.state || 'State'} {companyInfo?.zip || '12345'}</p>
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{companyInfo?.email || 'contact@company.com'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-3 w-3" />
                    <span>{companyInfo?.phone || '(555) 123-4567'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Bill To</h3>
              <div className="space-y-2">
                <h4 className="font-medium">{clientInfo?.full_name || 'Client Name'}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {clientInfo?.company_name && (
                    <div className="flex items-center space-x-1">
                      <Building className="h-3 w-3" />
                      <span>{clientInfo.company_name}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{clientInfo?.email || 'client@example.com'}</span>
                  </div>
                  {clientInfo?.phone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{clientInfo.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span>Issue Date</span>
              </div>
              <p className="font-semibold">{format(new Date(invoice.created_at), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span>Due Date</span>
              </div>
              <p className="font-semibold">{format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
              <p className="text-2xl font-bold">${invoice.amount.toLocaleString()}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {lineItems.map((item, index) => (
                <div key={index} className="px-6 py-4 grid grid-cols-12 gap-4 text-sm border-t">
                  <div className="col-span-6">{item.description}</div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-2 text-right">${item.rate.toFixed(2)}</div>
                  <div className="col-span-2 text-right font-medium">${item.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({(taxRate * 100).toFixed(0)}%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${total.toFixed(2)} {invoice.currency}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {invoice.status === 'paid' && invoice.paid_date && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">
                  Paid on {format(new Date(invoice.paid_date), 'MMMM d, yyyy')}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h4 className="font-medium mb-2">Payment Terms</h4>
            <p className="text-sm text-muted-foreground">
              Payment is due within 30 days of invoice date. Late payments may be subject to fees.
              For questions about this invoice, please contact us at billing@company.com.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={handlePrint}>
              <Print className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            {invoice.status !== 'paid' && (
              <Button>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Invoice
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}