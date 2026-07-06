import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.endpoints import router as ml_router

app = FastAPI(
    title="Smart Kitchen ML Service",
    description="Python FastAPI Microservice hosting 4 Machine Learning models for Smart Kitchen System.",
    version="1.0.0"
)

# Enable CORS for frontend and Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include ML router
app.include_router(ml_router)

@app.get("/")
def home():
    return {
        "status": "online",
        "service": "Smart Kitchen ML Microservice",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
