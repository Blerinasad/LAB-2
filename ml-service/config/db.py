import os
from sqlalchemy import create_engine
import pandas as pd
from dotenv import load_dotenv

# Load this service's configuration even when it is started from the project root.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Getuari1")
DB_NAME = os.getenv("DB_NAME", "smart_kitchen")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)

def get_db_connection():
    return engine.connect()

def load_table_to_df(table_name):
    with get_db_connection() as conn:
        df = pd.read_sql_table(table_name, conn)
    return df

def run_query_to_df(query, params=None):
    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn, params=params)
    return df
