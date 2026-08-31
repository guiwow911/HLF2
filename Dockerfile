# 自托管：docker build -t hlf2 . && docker run -p 8080:80 hlf2
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/  /usr/share/nginx/html/js/
EXPOSE 80
