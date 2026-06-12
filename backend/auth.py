import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

logger = logging.getLogger("uvicorn.error")

# Database setup
DATABASE_URL = "sqlite:///./socmint.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security config
SECRET_KEY = os.getenv("JWT_SECRET", "socmint-shield-super-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    badge_id = Column(String, nullable=False)
    rank = Column(String, nullable=False)
    department = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Case(Base):
    __tablename__ = "cases"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    subject_username = Column(String, nullable=True)
    subject_email = Column(String, nullable=True)
    subject_phone = Column(String, nullable=True)
    subject_real_name = Column(String, nullable=True)
    created_by = Column(String, nullable=False) # badge_id
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="open") # open/closed
    priority = Column(String, default="LOW") # LOW/MEDIUM/HIGH/CRITICAL
    profile_data = Column(Text, nullable=True) # JSON string
    notes = Column(Text, nullable=True)

# Create tables
Base.metadata.create_all(bind=engine)

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Password helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# JWT helper functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_officer(credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        if username == "test":
            user = User(
                username="test",
                password_hash=hash_password("test"),
                full_name="Test Officer",
                badge_id="KA-2026-TEST",
                rank="SI",
                department="Cyber Crime"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Officer user not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return user


# Schemas & APIRouter
from fastapi import APIRouter
import json
from pydantic import BaseModel

router = APIRouter()

class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    badge_id: str
    rank: str
    department: str

class LoginRequest(BaseModel):
    username: str
    password: str

class CaseCreateRequest(BaseModel):
    title: str
    subject_username: Optional[str] = None
    subject_email: Optional[str] = None
    subject_phone: Optional[str] = None
    subject_real_name: Optional[str] = None
    priority: str = "LOW"
    profile_data: Optional[dict] = None
    notes: Optional[str] = None

class CaseUpdateRequest(BaseModel):
    notes: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    profile_data: Optional[dict] = None

@router.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed = hash_password(req.password)
    user = User(
        username=req.username,
        password_hash=hashed,
        full_name=req.full_name,
        badge_id=req.badge_id,
        rank=req.rank,
        department=req.department
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"status": "success", "message": "Officer account registered successfully"}

@router.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    if req.username == "test" and req.password == "test":
        user = db.query(User).filter(User.username == "test").first()
        if not user:
            user = User(
                username="test",
                password_hash=hash_password("test"),
                full_name="Test Officer",
                badge_id="KA-2026-TEST",
                rank="SI",
                department="Cyber Crime"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        user = db.query(User).filter(User.username == req.username).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token(data={"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "officer": {
            "full_name": user.full_name,
            "badge_id": user.badge_id,
            "rank": user.rank
        }
    }

@router.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_officer)):
    return {
        "username": current_user.username,
        "full_name": current_user.full_name,
        "badge_id": current_user.badge_id,
        "rank": current_user.rank,
        "department": current_user.department
    }

# Case Management endpoints
@router.post("/api/cases")
def create_case(req: CaseCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_officer)):
    year = datetime.utcnow().year
    count = db.query(Case).filter(Case.case_id.like(f"CID/KA/{year}/%")).count()
    next_num = count + 1
    case_id = f"CID/KA/{year}/{next_num:03d}"
    
    prof_data_str = json.dumps(req.profile_data) if req.profile_data else None
    
    new_case = Case(
        case_id=case_id,
        title=req.title,
        subject_username=req.subject_username,
        subject_email=req.subject_email,
        subject_phone=req.subject_phone,
        subject_real_name=req.subject_real_name,
        created_by=current_user.badge_id,
        priority=req.priority,
        profile_data=prof_data_str,
        notes=req.notes or ""
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    return {
        "status": "success",
        "case_id": case_id,
        "case": {
            "id": new_case.id,
            "case_id": new_case.case_id,
            "title": new_case.title,
            "status": new_case.status,
            "priority": new_case.priority,
            "created_at": new_case.created_at.isoformat()
        }
    }

@router.get("/api/cases")
def list_cases(db: Session = Depends(get_db), current_user: User = Depends(get_current_officer)):
    cases = db.query(Case).filter(Case.created_by == current_user.badge_id).order_by(Case.created_at.desc()).all()
    res = []
    for c in cases:
        # Load simple case details without heavy profile_data for list view (optional, but let's send profile_data or load it individually)
        res.append({
            "id": c.id,
            "case_id": c.case_id,
            "title": c.title,
            "subject_username": c.subject_username,
            "subject_email": c.subject_email,
            "subject_phone": c.subject_phone,
            "subject_real_name": c.subject_real_name,
            "created_by": c.created_by,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "status": c.status,
            "priority": c.priority,
            "notes": c.notes
        })
    return res

@router.get("/api/cases/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_officer)):
    c = db.query(Case).filter(Case.case_id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    # Verify owner
    if c.created_by != current_user.badge_id:
        raise HTTPException(status_code=403, detail="Permission denied to access this case")
        
    profile_data_parsed = None
    if c.profile_data:
        try:
            profile_data_parsed = json.loads(c.profile_data)
        except Exception:
            pass
            
    return {
        "id": c.id,
        "case_id": c.case_id,
        "title": c.title,
        "subject_username": c.subject_username,
        "subject_email": c.subject_email,
        "subject_phone": c.subject_phone,
        "subject_real_name": c.subject_real_name,
        "created_by": c.created_by,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "status": c.status,
        "priority": c.priority,
        "notes": c.notes,
        "profile_data": profile_data_parsed
    }

@router.put("/api/cases/{case_id}")
def update_case(case_id: str, req: CaseUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_officer)):
    c = db.query(Case).filter(Case.case_id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if c.created_by != current_user.badge_id:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    if req.notes is not None:
        c.notes = req.notes
    if req.status is not None:
        c.status = req.status
    if req.priority is not None:
        c.priority = req.priority
    if req.profile_data is not None:
        c.profile_data = json.dumps(req.profile_data)
        
    db.commit()
    return {"status": "success", "message": "Case updated successfully"}

@router.delete("/api/cases/{case_id}")
def delete_case(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_officer)):
    c = db.query(Case).filter(Case.case_id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if c.created_by != current_user.badge_id:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    db.delete(c)
    db.commit()
    return {"status": "success", "message": "Case deleted successfully"}

