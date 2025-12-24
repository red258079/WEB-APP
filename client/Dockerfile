FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy client files to /usr/share/nginx/html/client
# This preserves the /client/... path structure used in the code
COPY . /usr/share/nginx/html/client

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
