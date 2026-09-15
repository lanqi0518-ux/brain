# Tiny static site — served by nginx-alpine.
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY swarm.js   /usr/share/nginx/html/swarm.js

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
