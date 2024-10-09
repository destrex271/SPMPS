import psycopg2
import os
from dotenv import load_dotenv

def connect_db():
    load_dotenv()

    DATABASE_URL = os.getenv('DB_URL')

    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("Connected to database successfully!")
        return conn
    except:
        print("Could not connect")
        return False





