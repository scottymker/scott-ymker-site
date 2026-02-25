import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db.mjs';
import { generateOrderNumber } from '../lib/order-number.mjs';
import { sendEmail } from '../lib/send-email.mjs';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// POST /api/stripe/create-payment-intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { line_items = [], metadata = {}, email } = req.body || {};

    if (!Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid line_items' });
    }

    let totalAmount = 0;
    const descriptionParts = [];

    for (const li of line_items) {
      const p = li?.price_data || {};
      const qty = li.quantity ?? 1;
      const unitAmount = p.unit_amount;
      if (unitAmount == null) {
        return res.status(400).json({ error: 'Each line item needs unit_amount' });
      }
      totalAmount += unitAmount * qty;
      descriptionParts.push(p.product_data?.name || 'Item');
    }

    if (totalAmount < 50) {
      return res.status(400).json({ error: 'Order total must be at least $0.50' });
    }

    const orderNumber = generateOrderNumber();

    const piMetadata = { order_number: orderNumber };
    for (const [k, v] of Object.entries(metadata)) {
      if (v != null && String(v).trim() !== '') {
        piMetadata[k] = String(v);
      }
    }

    const stripe = getStripe();

    const pi = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      description: `School Photos Order ${orderNumber}`,
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      metadata: piMetadata,
    });

    return res.json({
      clientSecret: pi.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      orderNumber,
      amount: totalAmount,
    });
  } catch (err) {
    console.error('POST /stripe/create-payment-intent error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /api/stripe/create-checkout-session
// Used by gallery.html (reorder flow). Accepts { line_items, email, metadata }
// and returns { url } for redirect to Stripe Checkout.
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { line_items = [], metadata = {}, email } = req.body || {};

    if (!Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid line_items' });
    }

    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const origin =
      req.headers.origin ||
      process.env.SITE_URL ||
      (req.headers.host ? `${proto}://${req.headers.host}` : 'http://192.168.1.63');

    const orderNumber = generateOrderNumber();

    // Build form-encoded body for Stripe checkout sessions API
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
    form.set('cancel_url', `${origin}/multi-order.html`);

    if (email) form.set('customer_email', String(email));
    form.set('phone_number_collection[enabled]', 'true');
    form.set('allow_promotion_codes', 'true');

    form.set('client_reference_id', orderNumber);
    form.set('metadata[order_number]', orderNumber);
    form.set('payment_intent_data[metadata][order_number]', orderNumber);
    form.set('payment_intent_data[description]', `School Photos Order ${orderNumber}`);

    line_items.forEach((li, i) => {
      const p = li?.price_data || {};
      if (p.unit_amount == null) {
        throw new Error('Each line item needs unit_amount');
      }
      form.set(`line_items[${i}][quantity]`, String(li.quantity ?? 1));
      form.set(`line_items[${i}][price_data][currency]`, String(p.currency || 'usd'));
      form.set(`line_items[${i}][price_data][unit_amount]`, String(p.unit_amount));
      form.set(`line_items[${i}][price_data][product_data][name]`, String(p.product_data?.name || 'Item'));
    });

    for (const [k, v] of Object.entries(metadata || {})) {
      if (v != null && String(v).trim() !== '') {
        form.set(`metadata[${k}]`, String(v));
        form.set(`payment_intent_data[metadata][${k}]`, String(v));
      }
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error('Stripe create-checkout-session error:', data);
      return res.status(stripeRes.status).json({ error: 'Stripe error', details: data });
    }

    return res.json({ url: data.url });
  } catch (err) {
    console.error('POST /stripe/create-checkout-session error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /api/stripe/webhook  — raw body required for signature verification
// The raw body middleware is applied in index.mjs before JSON parsing for this route.
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let evt;

  try {
    // req.body is a Buffer from express.raw() middleware (set in index.mjs)
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    if (sig && process.env.STRIPE_WEBHOOK_SECRET) {
      const stripe = getStripe();
      evt = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // No secret configured — parse raw body directly (dev mode)
      evt = JSON.parse(rawBody);
    }
  } catch (err) {
    console.error('Webhook verification error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Stripe webhook: ${evt.type}`);

  try {
    switch (evt.type) {
      case 'payment_intent.succeeded': {
        await handlePaymentSucceeded(evt.data.object);
        break;
      }
      case 'charge.refunded': {
        await handleChargeRefunded(evt.data.object);
        break;
      }
      default:
        // Unhandled event types are fine
        break;
    }
  } catch (handlerErr) {
    console.error(`Error handling ${evt.type}:`, handlerErr);
    // Return 200 anyway so Stripe doesn't retry indefinitely
  }

  return res.json({ received: true });
});

async function handlePaymentSucceeded(pi) {
  const md = pi.metadata || {};
  const orderNumber = md.order_number || generateOrderNumber();
  const amount = pi.amount;
  const parentEmail = pi.receipt_email || md.parent_email || null;
  const parentName = md.parent_name || null;
  const parentPhone = md.parent_phone || null;

  // Determine event_id from student code metadata
  const studentCode = md.student_code || md.code || null;
  let eventId = md.event_id || null;
  let studentId = null;

  if (studentCode) {
    const res = await query(
      'SELECT id, event_id FROM students WHERE code = $1',
      [studentCode.toUpperCase()]
    );
    if (res.rows.length > 0) {
      studentId = res.rows[0].id;
      eventId = eventId || res.rows[0].event_id;
    }
  }

  // Idempotency check — skip if order already recorded
  const existing = await query(
    'SELECT id FROM orders WHERE stripe_payment_intent_id = $1',
    [pi.id]
  );
  if (existing.rows.length > 0) {
    console.log(`Order for PI ${pi.id} already recorded, skipping.`);
    return;
  }

  const orderResult = await query(
    `INSERT INTO orders
       (stripe_payment_intent_id, order_number, status, amount,
        parent_name, parent_email, parent_phone, event_id, source, payment_method)
     VALUES ($1, $2, 'paid', $3, $4, $5, $6, $7, $8, 'stripe')
     RETURNING *`,
    [pi.id, orderNumber, amount, parentName, parentEmail, parentPhone,
     eventId, md.source || 'prepay']
  );
  const order = orderResult.rows[0];

  // Create order_items for each student encoded in metadata
  const studentCount = parseInt(md.students_count || '1', 10);
  for (let i = 1; i <= studentCount; i++) {
    const prefix = studentCount === 1 ? '' : `s${i}_`;
    const sCode = (studentCount === 1 ? studentCode : md[`s${i}_code`] || null);
    const sName = md[`${prefix}name`] || md.student_name || null;
    const pkg = md[`${prefix}pkg`] || null;
    const addons = (md[`${prefix}addons`] || '').split(',').map(s => s.trim()).filter(Boolean);
    const bg = md[`${prefix}bg`] || null;

    let sId = i === 1 ? studentId : null;
    if (!sId && sCode) {
      const r = await query('SELECT id FROM students WHERE code = $1', [sCode.toUpperCase()]);
      if (r.rows.length > 0) sId = r.rows[0].id;
    }

    await query(
      `INSERT INTO order_items
         (order_id, student_id, student_code, student_name, package, addons, background)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [order.id, sId, sCode, sName, pkg, addons, bg]
    );

    if (sId) {
      await query(
        `UPDATE students SET order_status = 'paid', order_id = $1 WHERE id = $2`,
        [order.id, sId]
      );
    }
  }

  // Build line items for email
  const PACKAGE_NAMES = {
    A:'Package A',A1:'Package A1 (A + Digital)',B:'Package B',B1:'Package B1 (B + 2 5x7)',
    C:'Package C',C1:'Package C1 (C + 2 5x7)',D:'Package D',D1:'Package D1 (D + 16 Mini)',
    E:'Package E',E1:'Package E1 (E + 8 Wallets)'
  };
  const ADDON_NAMES = {
    F:'8x10 Print',G:'2× 5x7 Prints',H:'4× 3½x5 Prints',I:'24 Wallets',
    J:'8 Wallets',K:'16 Mini Wallets',L:'Retouching',M:'8x10 Class Composite',N:'Digital File'
  };

  const emailItems = [];
  for (let i = 1; i <= studentCount; i++) {
    const prefix = studentCount === 1 ? '' : `s${i}_`;
    const name = md[`${prefix}name`] || md.student_name || `Student ${i}`;
    const pkg = md[`${prefix}pkg`] || '';
    const addonStr = md[`${prefix}addons`] || '';
    const bg = md[`${prefix}bg`] || 'F1';
    const addonsArr = addonStr.split(',').map(s => s.trim()).filter(Boolean);

    emailItems.push({ name, pkg, addons: addonsArr, bg });
  }

  const studentRows = emailItems.map(s => {
    const pkgLabel = PACKAGE_NAMES[s.pkg] || s.pkg || '—';
    const addonLabels = s.addons.map(a => ADDON_NAMES[a] || a).join(', ') || 'None';
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ebe5;font-weight:600;color:#1a1a1a;">${s.name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ebe5;color:#333;">${pkgLabel}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ebe5;color:#777;font-size:13px;">${addonLabels}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ebe5;color:#777;font-size:13px;">${s.bg}</td>
      </tr>`;
  }).join('');

  const receiptHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f5f0ea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(60,40,20,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#c4703f;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.02em;">Scott Ymker Photography</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Order Confirmation</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:15px;color:#777;">Hi ${parentName || 'there'},</p>
            <h2 style="margin:0 0 20px;font-size:22px;color:#1a1a1a;font-weight:600;">Thank you for your order!</h2>

            <!-- Order info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#faf8f5;border-radius:8px;border:1px solid #e8e0d8;">
              <tr>
                <td style="padding:14px 16px;">
                  <span style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:0.08em;">Order Number</span><br/>
                  <strong style="font-size:16px;color:#c4703f;">${orderNumber}</strong>
                </td>
                <td style="padding:14px 16px;text-align:right;">
                  <span style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:0.08em;">Total Paid</span><br/>
                  <strong style="font-size:20px;color:#1a1a1a;">$${(amount / 100).toFixed(2)}</strong>
                </td>
              </tr>
            </table>

            <!-- Line items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
              <thead>
                <tr style="background:#faf8f5;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#777;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #e8e0d8;">Student</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#777;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #e8e0d8;">Package</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#777;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #e8e0d8;">Add-ons</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#777;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #e8e0d8;">Bkgd</th>
                </tr>
              </thead>
              <tbody>
                ${studentRows}
              </tbody>
            </table>

            <!-- What's next -->
            <div style="background:#f8efe8;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #c4703f;">
              <p style="margin:0 0 6px;font-weight:600;color:#1a1a1a;font-size:14px;">What happens next?</p>
              <p style="margin:0;color:#555;font-size:13px;line-height:1.5;">
                We'll photograph your student on picture day. Finished prints are typically delivered to the school within 2–3 weeks. We'll send you a notification when they're ready!
              </p>
            </div>

            <p style="margin:0;color:#777;font-size:13px;line-height:1.5;">
              Questions? Reply to this email or reach us at <strong>(605) 550-0828</strong>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#faf8f5;border-top:1px solid #e8e0d8;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;">
              &copy; ${new Date().getFullYear()} Scott Ymker Photography &bull; Armour, SD
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  // Send receipt email
  if (parentEmail) {
    try {
      await sendEmail({
        to: parentEmail,
        subject: `Order Confirmed — ${orderNumber}`,
        html: receiptHtml,
      });
    } catch (emailErr) {
      console.error('Failed to send receipt email:', emailErr.message);
    }
  }
}

async function handleChargeRefunded(charge) {
  if (!charge.payment_intent) return;

  await query(
    `UPDATE orders SET status = 'refunded' WHERE stripe_payment_intent_id = $1`,
    [charge.payment_intent]
  );

  // Update linked students
  const { rows: orders } = await query(
    'SELECT id FROM orders WHERE stripe_payment_intent_id = $1',
    [charge.payment_intent]
  );
  for (const order of orders) {
    await query(
      `UPDATE students SET order_status = 'refunded' WHERE order_id = $1`,
      [order.id]
    );
  }
}

// GET /api/stripe/session/:id
router.get('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }

    const stripe = getStripe();

    // PaymentIntent (pi_) flow
    if (id.startsWith('pi_')) {
      const pi = await stripe.paymentIntents.retrieve(id);
      const md = pi.metadata || {};

      const items = [];
      const n = parseInt(md.students_count || '0', 10);
      for (let i = 1; i <= n; i++) {
        const pkg = md[`s${i}_pkg`];
        const name = md[`s${i}_name`] || `Student ${i}`;
        if (pkg) items.push({ description: `${name} — Package ${pkg}`, quantity: 1, currency: pi.currency });
        const addons = (md[`s${i}_addons`] || '').split(',').map(s => s.trim()).filter(Boolean);
        for (const code of addons) {
          items.push({ description: `${name} — Add-on ${code}`, quantity: 1, currency: pi.currency });
        }
      }

      return res.json({
        id: pi.id,
        amount_total: pi.amount,
        currency: pi.currency,
        items,
        customer_email: pi.receipt_email || null,
        customer_phone: md.parent_phone || null,
        metadata: md,
        payment_status: pi.status === 'succeeded' ? 'paid' : pi.status,
      });
    }

    // Legacy Checkout Session (cs_)
    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['line_items', 'payment_intent', 'customer_details'],
    });

    const items = (session.line_items?.data || []).map((li) => {
      const qty = li.quantity ?? 1;
      const amount = li.amount_total != null
        ? li.amount_total
        : (li.price?.unit_amount || 0) * qty;
      return {
        description: li.description || li.price?.product || 'Item',
        quantity: qty,
        amount_total: amount,
        unit_amount: li.price?.unit_amount,
        currency: li.currency || session.currency,
      };
    });

    const mergedMd = { ...(session.metadata || {}), ...(session.payment_intent?.metadata || {}) };

    return res.json({
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      items,
      customer_email: session.customer_details?.email || session.customer_email || null,
      customer_phone: session.customer_details?.phone || null,
      metadata: mergedMd,
      payment_status: session.payment_status || session.status || 'paid',
    });
  } catch (err) {
    console.error('GET /stripe/session/:id error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
