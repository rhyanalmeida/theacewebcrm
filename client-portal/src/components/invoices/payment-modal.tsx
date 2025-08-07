'use client'

import { useState, useEffect } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Shield, Lock, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type Invoice = Database['public']['Tables']['client_invoices']['Row']

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentModalProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentSuccess: () => void
}

interface PaymentFormProps {
  invoice: Invoice
  onSuccess: () => void
  onClose: () => void
}

const PaymentForm = ({ invoice, onSuccess, onClose }: PaymentFormProps) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card')

  useEffect(() => {
    createPaymentIntent()
  }, [invoice.id])

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: Math.round(invoice.amount * 100), // Convert to cents
          currency: invoice.currency.toLowerCase(),
        }),
      })

      const { client_secret } = await response.json()
      setClientSecret(client_secret)
    } catch (error) {
      setError('Failed to initialize payment. Please try again.')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements || !clientSecret) {
      return
    }

    setLoading(true)
    setError('')

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Customer', // This would come from the client profile
          },
        },
      }
    )

    if (paymentError) {
      setError(paymentError.message || 'Payment failed')
      setLoading(false)
    } else if (paymentIntent.status === 'succeeded') {
      // Update invoice status
      await updateInvoiceStatus(invoice.id, 'paid', paymentIntent.id)
      onSuccess()
    }
  }

  const updateInvoiceStatus = async (invoiceId: string, status: string, paymentIntentId: string) => {
    try {
      await fetch(`/api/invoices/${invoiceId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          payment_intent_id: paymentIntentId,
          paid_date: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('Failed to update invoice:', error)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Invoice #{invoice.invoice_number}</span>
            <span className="font-medium">${invoice.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Due Date</span>
            <span>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between font-semibold">
              <span>Total Amount</span>
              <span>${invoice.amount.toLocaleString()} {invoice.currency}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Payment Method</h3>
        <div className="grid grid-cols-1 gap-4">
          <Card 
            className={`cursor-pointer border-2 ${
              paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => setPaymentMethod('card')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="text-blue-600"
                />
                <CreditCard className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium">Credit or Debit Card</p>
                  <p className="text-sm text-gray-500">Visa, Mastercard, American Express</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Card Details */}
      {paymentMethod === 'card' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Card Details</h3>
          <div className="p-4 border border-gray-200 rounded-lg">
            <CardElement options={cardElementOptions} />
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="font-medium text-gray-900">Secure Payment</span>
        </div>
        <p className="text-sm text-gray-600">
          Your payment information is encrypted and secure. We use Stripe to process payments safely.
        </p>
        <div className="flex items-center space-x-4 mt-2">
          <div className="flex items-center space-x-1">
            <Lock className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">256-bit SSL</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-gray-500">PCI Compliant</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !clientSecret || loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay ${invoice.amount.toLocaleString()}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export function PaymentModal({ invoice, open, onOpenChange, onPaymentSuccess }: PaymentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Pay Invoice #{invoice.invoice_number}</span>
          </DialogTitle>
          <DialogDescription>
            Complete your payment securely using Stripe. Your card information is never stored on our servers.
          </DialogDescription>
        </DialogHeader>

        <Elements stripe={stripePromise}>
          <PaymentForm
            invoice={invoice}
            onSuccess={onPaymentSuccess}
            onClose={() => onOpenChange(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  )
}