"""
Orion Stats - Dataset API Endpoints
"""
import os
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.db.models import Dataset
from app.schemas.schemas import DatasetCreate, DatasetMeta, DatasetList, ColumnMeta, ColumnTypeUpdate
from app.services.data_service import (
    load_xlsx, save_parquet, analyze_columns, 
    rename_columns_to_keys, clear_cache
)

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/upload", response_model=DatasetCreate)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Query(None, description="Dataset name (defaults to filename)"),
    db: Session = Depends(get_db)
):
    """
    Upload XLSX file and create dataset.
    
    - Validates file extension (.xlsx, .xls)
    - Reads first sheet by default
    - Analyzes columns and detects variable types
    - Stores as parquet for performance
    """
    # Validate extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    ext = Path(file.filename).suffix.lower()
    if ext not in ('.xlsx', '.xls'):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Only .xlsx and .xls files are allowed."
        )
    
    # Validate size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB"
        )
    
    # Save to temp file and process
    try:
        with NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        # Load XLSX
        df = load_xlsx(tmp_path)
        
        # Analyze columns
        columns_meta = analyze_columns(df)
        
        # Create DB record first to get ID
        dataset_name = name or Path(file.filename).stem
        db_dataset = Dataset(
            name=dataset_name,
            original_filename=file.filename,
            parquet_path="",  # Will update after saving
            columns_meta=[col.model_dump() for col in columns_meta],
            row_count=len(df),
            col_count=len(df.columns)
        )
        db.add(db_dataset)
        db.commit()
        db.refresh(db_dataset)
        
        # Rename columns to keys and save as parquet
        df_keyed = rename_columns_to_keys(df, columns_meta)
        parquet_path = save_parquet(df_keyed, db_dataset.id)
        
        # Update parquet path
        db_dataset.parquet_path = str(parquet_path)
        db.commit()
        
        return DatasetCreate(
            id=db_dataset.id,
            name=db_dataset.name,
            original_filename=db_dataset.original_filename,
            row_count=db_dataset.row_count,
            col_count=db_dataset.col_count,
            columns=columns_meta,
            created_at=db_dataset.created_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
    
    finally:
        # Clean up temp file
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass


@router.get("/{dataset_id}/meta", response_model=DatasetMeta)
def get_dataset_meta(dataset_id: int, db: Session = Depends(get_db)):
    """Get dataset metadata."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    columns = [ColumnMeta(**col) for col in dataset.columns_meta]
    
    return DatasetMeta(
        id=dataset.id,
        name=dataset.name,
        original_filename=dataset.original_filename,
        row_count=dataset.row_count,
        col_count=dataset.col_count,
        columns=columns,
        created_at=dataset.created_at
    )


@router.get("/", response_model=DatasetList)
def list_datasets(db: Session = Depends(get_db)):
    """List all datasets."""
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    
    result = []
    for ds in datasets:
        columns = [ColumnMeta(**col) for col in ds.columns_meta]
        result.append(DatasetMeta(
            id=ds.id,
            name=ds.name,
            original_filename=ds.original_filename,
            row_count=ds.row_count,
            col_count=ds.col_count,
            columns=columns,
            created_at=ds.created_at
        ))
    
    return DatasetList(datasets=result)


@router.put("/{dataset_id}/column-type")
def update_column_type(
    dataset_id: int,
    update: ColumnTypeUpdate,
    db: Session = Depends(get_db)
):
    """Update variable type for a column."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Validate var_type
    if update.var_type not in ('categorical', 'discrete', 'continuous'):
        raise HTTPException(status_code=400, detail="Invalid variable type")
    
    # Update columns_meta
    updated = False
    columns_meta = dataset.columns_meta.copy()
    for col in columns_meta:
        if col['col_key'] == update.col_key:
            col['var_type'] = update.var_type
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Column not found")
    
    dataset.columns_meta = columns_meta
    db.commit()
    
    # Clear cache for this dataset
    clear_cache(dataset_id)
    
    return {"message": "Column type updated", "col_key": update.col_key, "var_type": update.var_type}


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Delete a dataset and its data files."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Delete parquet file
    try:
        if dataset.parquet_path and Path(dataset.parquet_path).exists():
            Path(dataset.parquet_path).unlink()
    except:
        pass
    
    # Clear cache
    clear_cache(dataset_id)
    
    # Delete DB record (cascades to scenarios)
    db.delete(dataset)
    db.commit()
    
    return {"message": "Dataset deleted", "id": dataset_id}
