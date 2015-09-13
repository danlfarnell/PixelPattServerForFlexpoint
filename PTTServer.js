var net = require('net');
var winston = require('winston');
var uti = require("./Util");
var ss = require("./literals/SystemSettings.js");
var chokidar = require("chokidar");
var clientList = [];
var fpm = require("./FlexPointMessages");
var clientIp;
var fpRequestType = require("./literals/FpRequestType");
var tXml;
var merchantName = "";


//Catch all errors that occur globally if they are not caught.
process.on("uncaughtException", function (err) {

    logger.error("Uncaught Exception: " + err);


});


if (process.argv[2] === "noLogging") {


    logger = module.exports = new (winston.Logger)({
        transports: []

    });

} else {


    logger = module.exports = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({

                colorize: 'all'


            }),
            new (winston.transports.DailyRotateFile)({

                filename: "Patt.log",
                prettyPrint: false,
                json: false,
                colorize: true


            })
        ]

    });

}


//License check
if (uti.licenseIsValid()) {

    merchantName = uti.licenseIsValid()[1];

} else {

    console.log("License doesn't exist or is corrupt!");
    process.exit("911");


}

//Set the request index.
ss.incrementRequestIndex(); //Will set to 1 if not set.


//Prepare system to watch the maitred int folder.
var watcher = chokidar.watch(ss.maitredIntPath, {
    ignored: /BACKUP|\.git/,
    ignoreInitial: true, persistent: false
});

watcher.on('add', function (path) {


    //Watch for answer files from maitred and send them back to pin pad.
    if (path.slice(-14, -10) === "Aptt") {

        var deviceID;


        uti.readMaitredResponseFile(path)
            .then(function (data) {
                return uti.buildObjectFromMDXml(data);
            })
            .then(function (xmlObject) {

                //Store the ip so we can send to the correct pin pad.
                deviceID = xmlObject.deviceID;

                if (xmlObject.errorResponse == true) {

                    if (xmlObject.error === "Table not locked") {

                        logger.info("MD Said Table not locked.  Payment can't be applied.");
                        return fpm.createTicketBalanceResponseError(xmlObject.error);

                    }


                    if (xmlObject.error === "Invoice closed") {

                        logger.info("Invoice is closed. Sending a Zero Balance Answer to Pin pad.");
                        return fpm.createTicketBalanceResponse("0");

                    } else {

                        logger.info("Creating a Ticket Response Error Answer For Pin Pad");
                        return fpm.createTicketResponseError(xmlObject.error);
                    }


                }
                if (xmlObject.invoiceByTableResponse == true) {
                    logger.info("Creating a Ticket Response Answer For Pin Pad");
                    return fpm.createTicketResponse(xmlObject);
                }
                if (xmlObject.invoiceByNumber == true) {

                    logger.info("Creating a Ticket Balance Response For Pin Pad");
                    return fpm.createTicketBalanceResponse(xmlObject.balance);

                }
                if (xmlObject.paymentResponse == true) {

                    //exit because pin pad does care about this response right now it sends a request later.
                    throw new Error("Abort Promise Chain");

                }


            })
            .then(function (xml) {


                tXml = xml;
                logger.info("Calculating Lrc");
                return fpm.calculateLRC(tXml);

            })
            .then(function (lrc) {

                logger.info("Appending special chars to Xml");
                return String.fromCharCode(2) + tXml.toString()
                    + String.fromCharCode(3) + lrc + String.fromCharCode(4);

            })
            .then(function (xmlToSendWithSpecialChars) {

                //find the pin pad that sent the message.
                clientList.forEach(function (pinPad) {

                    if (pinPad.remoteAddress === deviceID) {


                        logger.info("Sending data to Pin Pid @: " + deviceID + "\n\n");
                        uti.sendTicketResponseXmlToFPPinPad(xmlToSendWithSpecialChars, pinPad);

                    }


                });

                return "***File Watcher Function Chain Completed***";

            })
            .then(function (msg) {

                logger.info(msg);


            })
            .then(function () {
                logger.info("Deleting processed file from Md Int folder.");
                uti.deleteProcessedAnswerFile(path);
            })
            .catch(function (err) {

                if (err.message === "Abort Promise Chain") {

                    logger.info("Bypassing unneeded payment response from maitre'd");
                    logger.info("Deleting processed file from Md Int folder.");
                    uti.deleteProcessedAnswerFile(path);

                } else {

                    logger.error(err);

                }


            });


    }


});


var server = net.createServer({allowHalfOpen: true}, function (socket) {
//Encode in plain text
    socket.setEncoding("utf8");
    //socket.setKeepAlive(true, 500);

    //Log the clients Ip
    clientIp = socket.remoteAddress;


    //Push the socket reference on a stack to use later.
    clientList.push(socket);


    logger.info("Client Connected on Port#: " + socket.localPort + " IP: " + clientIp);


    //Get connections to the server
    this.getConnections(function (err, count) {
        if (err) {
            logger.error('error getting connections');
        } else {
            logger.info("Connections: count: " + count);
        }
    });


    //When data is received
    socket.on('data', function (data) {

        socket.write("\6");
        logger.info("Sent Ack message to pin pad");

        if (data.indexOf("<ServerId>") === -1 && data.indexOf("<TicketRequest>") > -1) {

            //tell the pin pad server Id wasn't entered

            var errMsg = fpm.createTicketResponseError("No Server #!");

            fpm.calculateLRC(errMsg)
                .then(function (lrc) {

                    return String.fromCharCode(2) + errMsg.toString()
                        + String.fromCharCode(3) + lrc + String.fromCharCode(4);


                })
                .then(function (formatXml) {

                    uti.sendTicketResponseXmlToFPPinPad(formatXml, socket);
                    logger.info("Server didn't enter their number");


                })
                .catch(function (err) {

                    logger.error(err);

                });


        } else {


            var cData;

            uti.logIncomingConnection(data, socket)
                .then(function () {

                    return uti.cleanSpecialChars(data)

                })
                .then(function (cleanData) {

                    cData = cleanData;
                    logger.info("Special Chars cleaned");

                    return uti.getFpRequestType(cleanData);

                })
                .then(function (requestType) {

                    if (requestType === fpRequestType.TicketRequest) {

                        logger.info("Parsing a ticket request");
                        return uti.parseTicketRequest(cData, clientIp);

                    }

                    if (requestType === fpRequestType.PurchaseResponse) {


                        logger.info("Parsing a purchase response request");
                        return uti.parsePurchaseResponse(cData, clientIp, merchantName);


                    }
                    if (requestType === fpRequestType.TicketBalanceRequest) {

                        logger.info("Parsing a ticket balance request");
                        return uti.parseTicketBalanceRequest(cData, clientIp);

                    }

                })
                .then(function (reqMessage) {

                    logger.info(reqMessage);


                })
                .catch(function (error) {

                    logger.error(error);

                });


        }


    });


    //When connection ends
    socket.on('end', function () {

        logger.info('Client Successfully Disconnected');
        logger.info("Cleaning up old connection");
        clientList.splice(clientList.indexOf(socket), 1);


    });


    //When their is a connection error.
    socket.on('error', function (err) {
        logger.error("Connection Error: " + err);
    });


});


server.on('error', function (err) {
    logger.error("Server Error: " + err);
});


server.on("close", function () {


    logger.error("Client Disconnected!");
    server.end();
});

server.on("end", function () {


    logger.info("Client closed connection after comm completed");


});

server.listen(9999, function () {

    logger.info("Server is listening on port #: " + server.address().port);

});





