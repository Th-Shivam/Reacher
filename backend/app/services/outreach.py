from datetime import datetime, timezone
from app.db.mongodb import outreach_collection
from app.schemas.outreach import OutreachCreate

async def create_outreach_campaign(user_id: str, outreach_data: OutreachCreate) -> dict:
    data = outreach_data.model_dump()
    data["clerk_id"] = user_id
    data["status"] = "pending"
    now = datetime.now(timezone.utc)
    data["created_at"] = now
    data["updated_at"] = now
    
    result = await outreach_collection.insert_one(data)
    
    # Retrieve the inserted document
    created_campaign = await outreach_collection.find_one({"_id": result.inserted_id})
    if created_campaign:
        created_campaign["_id"] = str(created_campaign["_id"])
        
    return created_campaign

async def get_outreach_campaigns(user_id: str) -> list[dict]:
    cursor = outreach_collection.find({"clerk_id": user_id}).sort("created_at", -1)
    campaigns = await cursor.to_list(length=100)
    for campaign in campaigns:
        campaign["_id"] = str(campaign["_id"])
    return campaigns
