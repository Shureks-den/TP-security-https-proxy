openssl req -new -key selfsigned.key -subj "/CN=$1" -sha256 | openssl x509 -req -days 3650 -CA selfsigned.crt -CAkey selfsigned.key -set_serial "$2" 
