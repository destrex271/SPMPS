from psycopg2 import pool
import os
from dotenv import load_dotenv

# def connect_db():
#     load_dotenv()

#     DATABASE_URL = os.getenv('DB_URL')

#     try:
#         conn = psycopg2.connect(DATABASE_URL)
#         print("Connected to database successfully!")
#         return conn
#     except:
#         print("Could not connect")
#         return False


class DB:
    def __init__(self) -> None:
        load_dotenv()
        self.connection_string = os.getenv('DB_URL')
        self.pool = pool.SimpleConnectionPool(
            1,
            10,
            self.connection_string
        )

        if not self.pool:
            raise RuntimeError("Unable to create connection pool!")

        self.health_check()

    def __get_connection(self):
        return self.pool.getconn()

    def __return_connection(self, connection):
        self.pool.putconn(connection)

    def health_check(self):
        res = self.executeSQL("SELECT version();")
        if not res:
            raise RuntimeError("DB not working!")

        print(res)
        return res 

    def executeSQL(self, stmnt):
        try:
            conn = self.__get_connection()
            cursor = conn.cursor()
            cursor.execute(stmnt)

            if stmnt.strip().upper().startswith(("UPDATE", "INSERT", "DELETE")):
                conn.commit()

            res = cursor.fetchmany() if cursor.description else None
            # res = cursor.fetchmany()
            cursor.close()
            self.__return_connection(conn)
            return res
        except Exception as e:
            return e


