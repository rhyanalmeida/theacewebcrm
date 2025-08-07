import { createSupabaseClient } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import type { Database } from '@/types/database'

type Invoice = Database['public']['Tables']['client_invoices']['Row']

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

class InvoiceService {
  private supabase = createSupabaseClient()

  async getInvoices(clientId: string) {
    const { data, error } = await this.supabase
      .from('client_invoices')
      .select(`
        *,
        client_projects (
          id,
          name
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getInvoice(id: string) {
    const { data, error } = await this.supabase
      .from('client_invoices')
      .select(`
        *,
        client_projects (
          id,
          name,
          description
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async markInvoiceViewed(id: string) {
    const { error } = await this.supabase
      .from('client_invoices')
      .update({ 
        status: 'viewed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'sent') // Only update if currently 'sent'

    if (error) throw error
  }

  async createPaymentIntent(invoiceId: string) {
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Payment intent creation failed:', error)
      throw error
    }
  }

  async processPayment(invoiceId: string) {
    try {
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe not loaded')

      const { clientSecret } = await this.createPaymentIntent(invoiceId)

      const { error } = await stripe.confirmPayment({
        elements: null as any, // Would be provided by Stripe Elements
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/invoices/${invoiceId}/success`,
        },
      })

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Payment processing failed:', error)
      throw error
    }
  }

  async downloadInvoicePDF(invoiceId: string) {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download failed:', error)
      throw error
    }
  }

  async getInvoiceStats(clientId: string) {
    const { data: invoices, error } = await this.supabase
      .from('client_invoices')
      .select('status, amount, due_date')
      .eq('client_id', clientId)

    if (error) throw error

    const now = new Date()
    const stats = {
      total: invoices.length,
      paid: invoices.filter(i => i.status === 'paid').length,
      pending: invoices.filter(i => ['sent', 'viewed'].includes(i.status)).length,
      overdue: invoices.filter(i => {
        const dueDate = new Date(i.due_date)
        return dueDate < now && i.status !== 'paid'
      }).length,
      totalAmount: invoices.reduce((sum, i) => sum + i.amount, 0),
      paidAmount: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount, 0),
      pendingAmount: invoices
        .filter(i => ['sent', 'viewed'].includes(i.status))
        .reduce((sum, i) => sum + i.amount, 0),
    }

    return stats
  }

  // Real-time subscriptions
  subscribeToInvoiceUpdates(clientId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('invoice-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_invoices',
          filter: `client_id=eq.${clientId}`
        },
        callback
      )
      .subscribe()
  }
}

export const invoiceService = new InvoiceService()