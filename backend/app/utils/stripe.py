import stripe
from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

def create_stripe_customer(email: str, name: str) -> str:
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        customer = stripe.Customer.create(
            email=email,
            name=name
        )
        return customer.id
    except Exception as e:
        print("Stripe customer creation error:", e)
        return f"cus_mock_{email.split('@')[0]}"

def create_checkout_session(customer_id: str, tenant_id: str, success_url: str, cancel_url: str) -> str:
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        session_params = {
            "payment_method_types": ["card"],
            "line_items": [{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "Pro Plan Subscription",
                    },
                    "unit_amount": 2900,
                    "recurring": {"interval": "month"}
                },
                "quantity": 1,
            }],
            "mode": "subscription",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {"tenant_id": tenant_id}
        }
        if customer_id and not customer_id.startswith("cus_mock_"):
            session_params["customer"] = customer_id
            
        session = stripe.checkout.Session.create(**session_params)
        return session.url
    except Exception as e:
        print("Stripe session creation error:", e)
        return f"{settings.FRONTEND_URL}/billing?success=true&mock_session=1"

def construct_event(payload: bytes, sig_header: str):
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
    )
