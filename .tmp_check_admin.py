import mysql.connector

conn = mysql.connector.connect(host='localhost', port=3306, user='root', password='', database='busqueda_canchas')
cur = conn.cursor()
cur.execute("SHOW TABLES LIKE 'administradores_gerentes'")
rows = cur.fetchall()
print('EXISTS', len(rows) > 0)
if rows:
    cur.execute('DESCRIBE administradores_gerentes')
    print('COLUMNS', cur.fetchall())
cur.close()
conn.close()
