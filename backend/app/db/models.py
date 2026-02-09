"""
Orion Stats - Database Models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Dataset(Base):
    """Dataset metadata model."""
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    parquet_path = Column(String(500), nullable=False)
    columns_meta = Column(JSON, nullable=False)  # {col_key: {name, dtype, var_type}}
    row_count = Column(Integer, nullable=False)
    col_count = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scenarios = relationship("Scenario", back_populates="dataset", cascade="all, delete-orphan")


class Scenario(Base):
    """Saved scenario model."""
    __tablename__ = "scenarios"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    payload = Column(JSON, nullable=False)  # Full state: filters, vars, target, features, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="scenarios")


class ActivityLog(Base):
    """Activity log model for tracking all user actions."""
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(50), nullable=False)  # 'upload', 'access', 'delete', 'update'
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)
    dataset_name = Column(String(255), nullable=True)  # Store name for when dataset is deleted
    filename = Column(String(255), nullable=True)
    user = Column(String(255), nullable=True, default="anonymous")  # User who performed the action
    ip_address = Column(String(50), nullable=True)  # Client IP address
    details = Column(Text, nullable=True)  # Additional details about the action
    created_at = Column(DateTime, default=datetime.utcnow)
