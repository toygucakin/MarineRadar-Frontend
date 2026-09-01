# Nginx Alpine resmi prodüksiyon imajı
FROM nginx:alpine

# Özel Nginx konfigürasyonunu kopyala
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Statik frontend dosyalarını kopyala
COPY index.html styles.css app.js logo.svg /usr/share/nginx/html/

# Dışa açılan HTTP portu
EXPOSE 80

# Nginx başlatma komutu
CMD ["nginx", "-g", "daemon off;"]
