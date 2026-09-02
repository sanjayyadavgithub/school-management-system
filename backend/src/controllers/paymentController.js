const FeePayment = require('../models/FeePayment');
const FeeStructure = require('../models/FeeStructure');
const User = require('../models/User');

// Dummy/Fallback implementations so the system runs out-of-the-box without paid accounts
let stripe = null;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_keys');
} catch (e) {
  console.log('Stripe SDK not installed, using mock fallback.');
}

let Razorpay = null;
try {
  Razorpay = require('razorpay');
} catch (e) {
  console.log('Razorpay SDK not installed, using mock fallback.');
}

// Helper to generate Invoice numbers
const generateInvoiceNumber = () => {
  return 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
};

// @desc    Create online checkout order (Stripe Session or Razorpay Order)
// @route   POST /api/payments/create-order
// @access  Private
exports.createOrder = async (req, res) => {
  const { studentId, feeStructureId, amount, gateway } = req.body; // gateway: 'Stripe' or 'Razorpay'

  try {
    if (!studentId || !feeStructureId || !amount || !gateway) {
      return res.status(400).json({ success: false, message: 'studentId, feeStructureId, amount, and gateway are required' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student user not found' });
    }

    const feeStructure = await FeeStructure.findById(feeStructureId);
    if (!feeStructure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }

    const invoice = generateInvoiceNumber();

    // Create a pending fee payment in database
    const feePayment = await FeePayment.create({
      schoolId: req.schoolId,
      studentId,
      feeStructureId,
      amountPaid: amount,
      pendingAmount: Math.max(0, feeStructure.amount - amount),
      paymentMode: 'Online',
      paymentGateway: gateway,
      paymentStatus: 'Pending',
      invoiceNumber: invoice,
      status: 'Pending'
    });

    if (gateway === 'Stripe') {
      if (stripe && process.env.STRIPE_SECRET_KEY) {
        // Real Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: feeStructure.name || 'School Fee Payment',
                description: `Invoice: ${invoice}`,
              },
              unit_amount: amount * 100, // in cents
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${req.headers.origin || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.headers.origin || 'http://localhost:3000'}/payment-cancelled`,
          client_reference_id: feePayment._id.toString(),
        });

        feePayment.gatewayOrderId = session.id;
        await feePayment.save();

        return res.status(200).json({ success: true, gateway, checkoutUrl: session.url, orderId: session.id, feePaymentId: feePayment._id });
      } else {
        // Mock Stripe Checkout URL
        const mockSessionId = 'cs_test_' + Date.now();
        feePayment.gatewayOrderId = mockSessionId;
        await feePayment.save();

        // Redirects to a local mock success page
        const mockUrl = `${req.headers.origin || 'http://localhost:3000'}/api/payments/mock-redirect?gateway=Stripe&orderId=${mockSessionId}&paymentId=py_${Date.now()}&feePaymentId=${feePayment._id}`;
        return res.status(200).json({ success: true, gateway, checkoutUrl: mockUrl, orderId: mockSessionId, feePaymentId: feePayment._id });
      }
    } else if (gateway === 'Razorpay') {
      if (Razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        // Real Razorpay Order
        const rzp = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const rzpOrder = await rzp.orders.create({
          amount: amount * 100, // paise
          currency: 'INR',
          receipt: invoice,
          notes: {
            feePaymentId: feePayment._id.toString(),
            schoolId: req.schoolId.toString()
          }
        });

        feePayment.gatewayOrderId = rzpOrder.id;
        await feePayment.save();

        return res.status(200).json({
          success: true,
          gateway,
          orderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          feePaymentId: feePayment._id,
          keyId: process.env.RAZORPAY_KEY_ID
        });
      } else {
        // Mock Razorpay Order
        const mockOrderId = 'order_mock_' + Date.now();
        feePayment.gatewayOrderId = mockOrderId;
        await feePayment.save();

        const mockUrl = `${req.headers.origin || 'http://localhost:3000'}/api/payments/mock-redirect?gateway=Razorpay&orderId=${mockOrderId}&paymentId=pay_${Date.now()}&feePaymentId=${feePayment._id}`;
        return res.status(200).json({
          success: true,
          gateway,
          orderId: mockOrderId,
          amount: amount * 100,
          currency: 'INR',
          feePaymentId: feePayment._id,
          checkoutUrl: mockUrl
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid gateway specified' });
    }
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating payment order' });
  }
};

// @desc    Mock redirect endpoint for local developer testing (100% Free sandbox simulator)
// @route   GET /api/payments/mock-redirect
// @access  Public
exports.mockRedirect = async (req, res) => {
  const { gateway, orderId, paymentId, feePaymentId } = req.query;
  try {
    const feePayment = await FeePayment.findById(feePaymentId);
    if (!feePayment) {
      return res.status(404).send('Payment record not found.');
    }

    // Process mock completion
    feePayment.paymentStatus = 'Success';
    feePayment.status = 'Paid';
    feePayment.gatewayPaymentId = paymentId;
    feePayment.gatewaySignature = 'mock_signature_success_' + Date.now();
    await feePayment.save();

    // Send visual success page
    res.send(`
      <html>
        <head>
          <title>Mock Sandbox Payment Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f7f6; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: inline-block; max-width: 450px; }
            .icon { font-size: 64px; color: #2ecc71; margin-bottom: 20px; }
            h1 { color: #2c3e50; font-size: 24px; margin-bottom: 10px; }
            p { color: #7f8c8d; font-size: 16px; line-height: 1.5; }
            .btn { background: #3498db; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 20px; }
            .details { text-align: left; background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h1>Mock Payment Approved!</h1>
            <p>You are using the offline developer sandbox (100% Free mode). We have mock simulated a successful transaction.</p>
            <div class="details">
              <strong>Gateway:</strong> ${gateway}<br>
              <strong>Order ID:</strong> ${orderId}<br>
              <strong>Transaction ID:</strong> ${paymentId}<br>
              <strong>Status:</strong> Approved
            </div>
            <p>Redirecting back to dashboard, please wait...</p>
            <script>
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 4000);
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Mock redirect error:', error);
    res.status(500).send('Error processing mock payment.');
  }
};

// @desc    Stripe Webhook Listener
// @route   POST /api/payments/webhook/stripe
// @access  Public
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Fallback fallback if stripe is not configured fully
      event = req.body;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const feePaymentId = session.client_reference_id;

      const feePayment = await FeePayment.findById(feePaymentId);
      if (feePayment) {
        feePayment.paymentStatus = 'Success';
        feePayment.status = 'Paid';
        feePayment.gatewayPaymentId = session.payment_intent;
        await feePayment.save();
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// @desc    Razorpay Webhook Verification
// @route   POST /api/payments/webhook/razorpay
// @access  Public
exports.razorpayWebhook = async (req, res) => {
  const crypto = require('crypto');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_secret_webhook_123';

  try {
    const signature = req.headers['x-razorpay-signature'];
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const payload = req.body;
    if (payload.event === 'order.paid') {
      const { id: gatewayOrderId, receipt } = payload.payload.order.entity;
      const feePayment = await FeePayment.findOne({ gatewayOrderId });
      if (feePayment) {
        feePayment.paymentStatus = 'Success';
        feePayment.status = 'Paid';
        feePayment.gatewayPaymentId = payload.payload.payment.entity.id;
        feePayment.gatewaySignature = signature;
        await feePayment.save();
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay Webhook error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing webhook' });
  }
};
