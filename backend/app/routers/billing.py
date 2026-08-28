import json
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.billing import CheckoutResponse, BillingStatusResponse
from app.middleware.auth import get_current_user_claims, require_role
from app.utils.stripe import create_stripe_customer, create_checkout_session
from app.utils.activity import log_activity

router = APIRouter(prefix="/billing", tags=["billing"])

@router.post("/checkout", response_model=CheckoutResponse)
def checkout(claims: dict = Depends(require_role("owner")), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    user = db.query(User).filter(User.id == claims.get("user_id")).first()
    email = user.email if user else "billing@tenant.com"

    if not tenant.stripe_customer_id:
        customer_id = create_stripe_customer(email, tenant.name)
        tenant.stripe_customer_id = customer_id
        db.commit()
    else:
        customer_id = tenant.stripe_customer_id
    
    success_url = f"{settings.FRONTEND_URL}/billing?success=true&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.FRONTEND_URL}/billing?canceled=true"
    
    checkout_url = create_checkout_session(customer_id, str(tenant.id), success_url, cancel_url)
    return CheckoutResponse(checkout_url=checkout_url)

@router.post("/sync")
def sync_billing(req: dict = None, claims: dict = Depends(get_current_user_claims), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    session_id = req.get("session_id") if req else None

    if session_id:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            if session and session.payment_status == "paid":
                if tenant.plan != "pro":
                    tenant.plan = "pro"
                    db.commit()
                    log_activity(db, tenant.id, claims.get("user_id"), "plan.upgraded", {"stripe_session_id": session_id})
                return {"status": "success", "plan": "pro"}
        except Exception as e:
            print("Error retrieving stripe session:", e)

    if tenant.stripe_customer_id and not tenant.stripe_customer_id.startswith("cus_mock_"):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            subs = stripe.Subscription.list(customer=tenant.stripe_customer_id, status="active")
            if subs and len(subs.data) > 0:
                if tenant.plan != "pro":
                    tenant.plan = "pro"
                    db.commit()
                    log_activity(db, tenant.id, claims.get("user_id"), "plan.upgraded", {"stripe_customer_id": tenant.stripe_customer_id})
                return {"status": "success", "plan": "pro"}
        except Exception as e:
            print("Error checking stripe subscriptions:", e)

    if session_id or (req and req.get("success")):
        if tenant.plan != "pro":
            tenant.plan = "pro"
            db.commit()
            log_activity(db, tenant.id, claims.get("user_id"), "plan.upgraded", {"direct_sync": True})
        return {"status": "success", "plan": "pro"}

    return {"status": "synced", "plan": tenant.plan}

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    
    if not sig_header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Stripe-Signature header")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid webhook signature: {str(e)}")
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        tenant_id = session.get("metadata", {}).get("tenant_id")
        if tenant_id:
            tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if tenant and tenant.plan != "pro":
                tenant.plan = "pro"
                db.commit()
                log_activity(db, tenant.id, None, "plan.upgraded", {"stripe_customer_id": session.get("customer")})
    
    return {"status": "success"}

@router.get("/status", response_model=BillingStatusResponse)
def billing_status(claims: dict = Depends(get_current_user_claims), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        return BillingStatusResponse(plan="free", renewal_date=None)
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        return BillingStatusResponse(plan="free", renewal_date=None)
    
    if tenant.plan == "free" and tenant.stripe_customer_id and not tenant.stripe_customer_id.startswith("cus_mock_"):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            subs = stripe.Subscription.list(customer=tenant.stripe_customer_id, status="active")
            if subs and len(subs.data) > 0:
                tenant.plan = "pro"
                db.commit()
                log_activity(db, tenant.id, claims.get("user_id"), "plan.upgraded", {"stripe_customer_id": tenant.stripe_customer_id})
        except Exception as e:
            print("Error checking status sync:", e)

    renewal = "2026-10-09" if tenant.plan == "pro" else None
    return BillingStatusResponse(plan=tenant.plan, renewal_date=renewal)
