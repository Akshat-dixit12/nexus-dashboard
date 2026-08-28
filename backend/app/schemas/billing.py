from pydantic import BaseModel
from typing import Optional

class CheckoutResponse(BaseModel):
    checkout_url: str

class BillingStatusResponse(BaseModel):
    plan: str
    renewal_date: Optional[str] = None
