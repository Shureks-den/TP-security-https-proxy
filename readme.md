Задание 2

Само задание можно прочитать в файле task.md

Так как используются самоподписанные ключи, чтобы curl не ругался необходимо использовать флаг -k пример:
`curl -k -x http://127.0.0.1:8080 https://mail.ru/`

Сборка докер-контейнера:
`docker build . -t proxy`

Запуск контейнера на 8080 порту:
`docker run -p 8080:8080 -t proxy`


Для запуска без контейнера нужно сгенерить ключи 
`sh gen_ca.crt`
И установить зависимости 
`npm install`