from pathlib import Path
p = Path('server.js')
t = p.read_text(encoding='utf-8')
old_sql = 'INSERT INTO imagenes_cancha (id_complejo, url_imagen, descripcion, fecha_subida) VALUES (?, ?, ?, NOW())'
new_sql = 'INSERT INTO imagenes_cancha (id_cancha, url_imagen, descripcion, fecha_subida) VALUES (?, ?, ?, NOW())'
old_params = '[idComplejo, publicImageUrl, "Foto subida desde la galería"]'
new_params = '[idCancha, publicImageUrl, "Foto subida desde la galería"]'
t = t.replace(old_sql, new_sql)
t = t.replace(old_params, new_params)
p.write_text(t, encoding='utf-8')
print('OK')
print('HAS_ID_COMPLEJO', 'INSERT INTO imagenes_cancha (id_complejo' in t)
print('HAS_ID_CANCHA', 'INSERT INTO imagenes_cancha (id_cancha' in t)
