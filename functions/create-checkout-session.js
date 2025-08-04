import Stripe from 'stripe';

export async function onRequestPost(context) {
  try {
    const stripe = new Stripe(context.env.Stripe_Key, {
      apiVersion: '2022-11-15',
    });

    const body = await context.request.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: body.items,
      success_url: `${context.request.headers.get("origin")}/success.html`,
      cancel_url: `${context.request.headers.get("origin")}/cancel.html`,
      metadata: {
        student_first_name: body.student.firstName,
        student_last_name: body.student.lastName,
        teacher: body.student.teacher,
        grade: body.student.grade,
        school: body.student.school,
        parent_name: body.parent.name,
        parent_phone: body.parent.phone,
        parent_email: body.parent.email,
        background: body.background
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}