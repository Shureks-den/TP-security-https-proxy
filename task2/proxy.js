import net from 'net'
import tls from 'tls'
import { spawn } from 'child_process';
import fs from 'fs'
import http from 'http'
import url from 'url'

const certs = {};
fs.readdirSync('certs/').forEach(file => {
    certs[file.substring(0, file.length - 4)] = fs.readFileSync('certs/' + file)
});

const key = fs.readFileSync('selfsigned.key');
const cert = fs.readFileSync('selfsigned.crt');

function createSecureContext(cert) {
    return tls.createSecureContext({
        key: key,
        cert: cert
    })
}

function generateCert(servername, cb) {
    console.log(`gen cert ${servername}`);
    let gen_cert = spawn('./gen_cert.sh', [servername, Math.floor(Math.random() * 1000000000000)]);

    gen_cert.stdout.once('data', (data) => {
        certs[servername] = data;
        let ctx = createSecureContext(data);
        cb(null, ctx);
        fs.writeFile(`certs/${servername}.crt`, data, (err) => {
            if (err) {
                console.log(err.message)
            }
        })
    });

    gen_cert.stderr.on('data', (data) => {
        console.log(`cert gen stderr: ${data}`)
    })
}

function SNICallback(servername, cb) {
    // console.log(`snicallback ${servername}`)
    if (servername in certs) {
        console.log(`using existing cert ${servername}`);
        let ctx = createSecureContext(certs[servername]);
        cb(null, ctx)
    } else {
        generateCert(servername, cb)
    }
}

function httpConnection(req, res) {
    if (req.url.startsWith('http')) {
        try {
            const parsedUrl = url.parse(req.url);
            const options = {
                host: parsedUrl.hostname,
                port: 80
            };
            const proxyReq = net.connect(options, () => {

                let h = '';
                for (let i = 0; i < req.rawHeaders.length / 2; ++i) {
                    if (req.rawHeaders[i * 2] === 'Proxy-Connection') {
                        continue
                    }
                    h += `${req.rawHeaders[i * 2]}: ${req.rawHeaders[i * 2 + 1]}\r\n`;
                }
                let p = Buffer.from(`${req.method} ${parsedUrl.path} HTTP/1.1\r\n${h}\r\n`)
                proxyReq.write(p);
                req.socket.pipe(proxyReq).pipe(req.socket);        
            });
            proxyReq.on('error', (e) => {
                console.log(`proxyReq error ${e}`)
            })

        } catch (e) {
            console.log(`Unable to parse ${req.url}`)
        }
    }
}

const server = http.createServer(httpConnection);

server.on('connect', (req, clientProxySocket, head) => {
    console.log(`connect ${req.url}`);
    let serverPort = req.url.split(':')[1];
    let serverHost = req.url.split(':')[0];

    let proxyToServerSocket = tls.connect({
        host: serverHost,
        port: serverPort
    }, () => {
    console.log('PROXY TO SERVER SET UP');
    
    clientProxySocket.write('HTTP/1.1 200 Connection established \r\n\n');

    const tlsOptions = {
        key: key,
        cert: cert,
        SNICallback: SNICallback,
        isServer: true
    };

    const tlsSocket = new tls.TLSSocket(clientProxySocket, tlsOptions);
    tlsSocket.pipe(proxyToServerSocket).pipe(tlsSocket);
    });
    clientProxySocket.on('error', (err) => {
        console.log(err);
    })
})

server.on('close', () => {
    console.log('Client Disconnected');
});

server.listen(8080, () => {
    console.log('Server runnig at http://localhost:' + 8080);
});