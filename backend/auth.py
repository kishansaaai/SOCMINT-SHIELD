import os
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, Session
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./socmint.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    badge_id = Column(String, unique=True, index=True)
    rank = Column(String)
    department = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True, index=True)
    title = Column(String)
    subject_username = Column(String, nullable=True)
    subject_email = Column(String, nullable=True)
    subject_phone = Column(String, nullable=True)
    subject_real_name = Column(String, nullable=True)
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="OPEN")
    priority = Column(String, default="MEDIUM")
    profile_data = Column(String, nullable=True)
    notes = Column(String, default="")

Base.metadata.create_all(bind=engine)

# Security setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-socmint-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    badge_id: str
    rank: str
    department: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    officer: dict

class CaseCreate(BaseModel):
    title: str
    subject_username: Optional[str] = None
    subject_email: Optional[str] = None
    subject_phone: Optional[str] = None
    subject_real_name: Optional[str] = None
    priority: str = "MEDIUM"
    profile_data: Optional[dict] = None

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    profile_data: Optional[dict] = None

# Routers
router = APIRouter(prefix="/api/auth", tags=["auth"])
cases_router = APIRouter(prefix="/api/cases", tags=["cases"])

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_officer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Auth Endpoints
@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_badge = db.query(User).filter(User.badge_id == user.badge_id).first()
    if db_badge:
        raise HTTPException(status_code=400, detail="Badge ID already registered")

    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        password_hash=hashed_password,
        full_name=user.full_name,
        badge_id=user.badge_id,
        rank=user.rank,
        department=user.department
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Officer registered successfully"}

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "officer": {
            "full_name": db_user.full_name,
            "badge_id": db_user.badge_id,
            "rank": db_user.rank
        }
    }

@router.get("/me")
def read_users_me(current_officer: User = Depends(get_current_officer)):
    return {
        "username": current_officer.username,
        "full_name": current_officer.full_name,
        "badge_id": current_officer.badge_id,
        "rank": current_officer.rank,
        "department": current_officer.department,
        "created_at": current_officer.created_at
    }

# Cases Endpoints
@cases_router.post("")
def create_case(case_in: CaseCreate, current_officer: User = Depends(get_current_officer), db: Session = Depends(get_db)):
    count = db.query(Case).count()
    new_case_id = f"CID/KA/{datetime.utcnow().year}/{str(count + 1).zfill(3)}"
    
    new_case = Case(
        case_id=new_case_id,
        title=case_in.title,
        subject_username=case_in.subject_username,
        subject_email=case_in.subject_email,
        subject_phone=case_in.subject_phone,
        subject_real_name=case_in.subject_real_name,
        created_by=current_officer.badge_id,
        status="OPEN",
        priority=case_in.priority,
        profile_data=json.dumps(case_in.profile_data) if case_in.profile_data else None,
        notes=""
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    case_dict = {k: v for k, v in new_case.__dict__.items() if not k.startswith('_')}
    if case_dict.get('profile_data'):
        case_dict['profile_data'] = json.loads(case_dict['profile_data'])
    return case_dict

@cases_router.get("")
def list_cases(current_officer: User = Depends(get_current_officer), db: Session = Depends(get_db)):
    cases = db.query(Case).filter(Case.created_by == current_officer.badge_id).order_by(Case.created_at.desc()).all()
    results = []
    for c in cases:
        cd = {k: v for k, v in c.__dict__.items() if not k.startswith('_')}
        cd['profile_data'] = None # don't send huge profile data in list
        results.append(cd)
    return results

@cases_router.get("/{case_id}")
def get_case(case_id: str, current_officer: User = Depends(get_current_officer), db: Session = Depends(get_db)):
    # URL encoded case_id might have '%2F' instead of '/', fastapi parses it but let's be sure.
    c = db.query(Case).filter(Case.case_id == case_id, Case.created_by == current_officer.badge_id).first()
    if not c:
        # Also try replacing %2F just in case
        c = db.query(Case).filter(Case.case_id == case_id.replace("%2F", "/"), Case.created_by == current_officer.badge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
        
    cd = {k: v for k, v in c.__dict__.items() if not k.startswith('_')}
    if cd.get('profile_data'):
        try:
            cd['profile_data'] = json.loads(cd['profile_data'])
        except:
            pass
    return cd

@cases_router.put("/{case_id}")
def update_case(case_id: str, case_update: CaseUpdate, current_officer: User = Depends(get_current_officer), db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.case_id == case_id, Case.created_by == current_officer.badge_id).first()
    if not c:
        c = db.query(Case).filter(Case.case_id == case_id.replace("%2F", "/"), Case.created_by == current_officer.badge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case_update.status is not None:
        c.status = case_update.status
    if case_update.priority is not None:
        c.priority = case_update.priority
    if case_update.notes is not None:
        c.notes = case_update.notes
    if case_update.profile_data is not None:
        c.profile_data = json.dumps(case_update.profile_data)
        
    db.commit()
    db.refresh(c)
    
    cd = {k: v for k, v in c.__dict__.items() if not k.startswith('_')}
    if cd.get('profile_data'):
        try:
            cd['profile_data'] = json.loads(cd['profile_data'])
        except:
            pass
    return cd

@cases_router.delete("/{case_id}")
def delete_case(case_id: str, current_officer: User = Depends(get_current_officer), db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.case_id == case_id, Case.created_by == current_officer.badge_id).first()
    if not c:
        c = db.query(Case).filter(Case.case_id == case_id.replace("%2F", "/"), Case.created_by == current_officer.badge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
        
    db.delete(c)
    db.commit()
    return {"message": "Case deleted"}
