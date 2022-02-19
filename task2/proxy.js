import net from 'net'

const server = net.createServer();

server.on('connection', (clientProxySocket) => {
    console.log('Client Connected To Proxy');

    clientProxySocket.once('data', (data) => {
        // ищем connect чтобы понять http или https
        const isTLSConnection = data.toString().indexOf('CONNECT') !== -1;
        let serverPort;
        let serverHost;
        if (isTLSConnection) {
            serverPort = 443;
            /*
            Пришел запрос такого вида достаем из него адрес
            CONNECT mail.ru:443 HTTP/1.1
            Host: mail.ru:443
            User-Agent: curl/7.64.1
            Proxy-Connection: Keep-Alive
            */
            serverHost = data.toString().split('CONNECT ')[1].split(' ')[0].split(':')[0];
        } else {
            serverPort = 80;
            serverHost = data.toString().split('Host: ')[1].split('\r\n')[0];
        }
        let proxyToServerSocket = net.createConnection({
                host: serverHost,
                port: serverPort
            }, () => {
            console.log('PROXY TO SERVER SET UP');
            
            if (isTLSConnection) {
                clientProxySocket.write('HTTP/1.0 200 Connection established \r\n\n');
            } else {
                proxyToServerSocket.write(data);
            }

            clientProxySocket.pipe(proxyToServerSocket);
            proxyToServerSocket.pipe(clientProxySocket);
            proxyToServerSocket.on('error', (err) => {
                console.log(err);
            });
        });
        clientProxySocket.on('error', (err) => {
            console.log(err);
        })
    })
})

server.on('close', () => {
    console.log('Client Disconnected');
});

server.listen(8080, () => {
    console.log('Server runnig at http://localhost:' + 8080);
});