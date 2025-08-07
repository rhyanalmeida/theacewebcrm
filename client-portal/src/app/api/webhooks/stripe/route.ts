import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServiceClient } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const invoiceId = paymentIntent.metadata.invoiceId

        if (invoiceId) {
          // Update invoice status to paid
          await supabase
            .from('client_invoices')
            .update({
              status: 'paid',
              paid_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId)

          // Create a notification for the client
          const { data: invoice } = await supabase
            .from('client_invoices')
            .select('client_id, invoice_number, amount')
            .eq('id', invoiceId)
            .single()

          if (invoice) {
            await supabase
              .from('client_notifications')
              .insert({
                client_id: invoice.client_id,
                title: 'Payment Confirmed',
                message: `Your payment for invoice ${invoice.invoice_number} has been processed successfully.`,
                type: 'invoice',
                data: {
                  invoiceId,
                  amount: invoice.amount,
                },
              })
          }
        }
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        const failedInvoiceId = failedPayment.metadata.invoiceId

        if (failedInvoiceId) {
          // Create a notification for the failed payment
          const { data: invoice } = await supabase
            .from('client_invoices')
            .select('client_id, invoice_number')
            .eq('id', failedInvoiceId)
            .single()

          if (invoice) {
            await supabase
              .from('client_notifications')
              .insert({
                client_id: invoice.client_id,
                title: 'Payment Failed',
                message: `Payment for invoice ${invoice.invoice_number} was unsuccessful. Please try again or contact support.`,
                type: 'invoice',
                data: {
                  invoiceId: failedInvoiceId,
                  error: failedPayment.last_payment_error?.message || 'Unknown error',
                },
              })
          }
        }
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing failed:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}